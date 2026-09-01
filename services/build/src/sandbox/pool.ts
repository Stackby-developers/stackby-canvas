import type { SandboxAdapter } from './types.js';
import { ProcessSandbox } from './process.js';
import { FirecrackerSandbox } from './firecracker.js';
import type { Config } from '../config.js';

// p-limit is ESM-only; use a simple counting semaphore to avoid dynamic import at module level
class Semaphore {
  private count: number;
  private readonly queue: Array<() => void> = [];

  constructor(limit: number) {
    this.count = limit;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.count++;
    }
  }
}

export class SandboxPool {
  private readonly pool: SandboxAdapter[] = [];
  private readonly sem: Semaphore;

  constructor(private readonly config: Config) {
    this.sem = new Semaphore(config.POOL_SIZE);
  }

  async warm(size = this.config.POOL_SIZE): Promise<void> {
    for (let i = 0; i < size; i++) {
      this.pool.push(this.createAdapter());
    }
  }

  private createAdapter(): SandboxAdapter {
    if (this.config.SANDBOX_TYPE === 'firecracker') return new FirecrackerSandbox();
    return new ProcessSandbox();
  }

  async run<T>(fn: (sandbox: SandboxAdapter) => Promise<T>): Promise<T> {
    await this.sem.acquire();
    const sandbox = this.pool.pop() ?? this.createAdapter();
    try {
      return await fn(sandbox);
    } finally {
      if (sandbox.reusable) {
        this.pool.push(sandbox);
      } else {
        await sandbox.destroy().catch(() => {});
        this.pool.push(this.createAdapter());
      }
      this.sem.release();
    }
  }

  async drain(): Promise<void> {
    await Promise.all(this.pool.map((s) => s.destroy().catch(() => {})));
    this.pool.length = 0;
  }
}
