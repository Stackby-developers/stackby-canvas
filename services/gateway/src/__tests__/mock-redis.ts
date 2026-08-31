// In-memory Redis mock sufficient for unit tests.
// Supports: get, set (with EX), del, mget, pttl, pipeline, eval (token bucket Lua).

export type MockRedis = ReturnType<typeof createMockRedis>;

export function createMockRedis() {
  const store = new Map<string, { value: string; expiresAt: number | null }>();

  function isExpired(entry: { expiresAt: number | null }): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  function getRaw(key: string): string | null {
    const entry = store.get(key);
    if (!entry || isExpired(entry)) {
      if (entry) store.delete(key);
      return null;
    }
    return entry.value;
  }

  const tokenBuckets = new Map<string, { tokens: number; last: number }>();

  const redis = {
    async get(key: string): Promise<string | null> {
      return getRaw(key);
    },
    async set(
      key: string,
      value: string,
      ...args: unknown[]
    ): Promise<'OK'> {
      let expiresAt: number | null = null;
      const argList = args as (string | number)[];
      for (let i = 0; i < argList.length; i++) {
        const flag = String(argList[i]).toUpperCase();
        if (flag === 'EX' && argList[i + 1] != null) {
          expiresAt = Date.now() + Number(argList[i + 1]) * 1000;
          i++;
        } else if (flag === 'PX' && argList[i + 1] != null) {
          expiresAt = Date.now() + Number(argList[i + 1]);
          i++;
        } else if (flag === 'NX') {
          if (getRaw(key) !== null) return 'OK' as never; // NX: don't set if exists
          // fall through to set
        }
      }
      // Check NX flag
      const hasNX = argList.some((a) => String(a).toUpperCase() === 'NX');
      if (hasNX && getRaw(key) !== null) return null as unknown as 'OK';
      store.set(key, { value, expiresAt });
      return 'OK';
    },
    async del(...keys: string[]): Promise<number> {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n++;
      return n;
    },
    async mget(...keys: string[]): Promise<(string | null)[]> {
      return keys.map((k) => getRaw(k));
    },
    async pttl(key: string): Promise<number> {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) return -2;
      if (entry.expiresAt === null) return -1;
      return Math.max(0, entry.expiresAt - Date.now());
    },
    async ping(): Promise<'PONG'> {
      return 'PONG';
    },
    async eval(script: string, _numKeys: number, ...args: unknown[]): Promise<unknown> {
      // Implement the token bucket Lua script in JS
      const key = args[0] as string;
      const now = Number(args[1]);
      const rate = Number(args[2]);
      const burst = Number(args[3]);
      const cost = Number(args[4]);

      let state = tokenBuckets.get(key) ?? { tokens: burst, last: now };
      const elapsed = (now - state.last) / 1000;
      state.tokens = Math.min(burst, state.tokens + elapsed * rate);

      if (state.tokens >= cost) {
        state.tokens -= cost;
        state.last = now;
        tokenBuckets.set(key, state);
        return [1, 0];
      } else {
        const wait = Math.ceil(((cost - state.tokens) / rate) * 1000);
        state.last = now;
        tokenBuckets.set(key, state);
        return [0, wait];
      }
    },
    pipeline() {
      const ops: Array<() => Promise<unknown>> = [];
      const p = {
        set(key: string, value: string, ...args: unknown[]) {
          ops.push(() => redis.set(key, value, ...args));
          return p;
        },
        get(key: string) {
          ops.push(() => redis.get(key));
          return p;
        },
        del(...keys: string[]) {
          ops.push(() => redis.del(...keys));
          return p;
        },
        async exec() {
          return Promise.all(ops.map((op) => op().then((v) => [null, v])));
        },
      };
      return p;
    },
    // Expose store for inspection in tests
    _store: store,
  };

  return redis;
}
