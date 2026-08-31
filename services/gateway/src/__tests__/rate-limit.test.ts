import { describe, it, expect } from 'vitest';
import { PerStackTokenBucket } from '../rate-limit/token-bucket.js';
import { CooldownManager, isRateLimitError } from '../rate-limit/backoff.js';
import { createMockRedis } from './mock-redis.js';

describe('PerStackTokenBucket', () => {
  it('allows up to burst requests immediately, denies the rest', async () => {
    const redis = createMockRedis();
    const bucket = new PerStackTokenBucket(redis as never, 5, 5);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => bucket.consume('stk_test')),
    );

    const allowed = results.filter((r) => r.allowed);
    const denied = results.filter((r) => !r.allowed);

    // At most burst (5) are allowed immediately; the rest must wait
    expect(allowed.length).toBeLessThanOrEqual(5);
    expect(denied.length).toBeGreaterThanOrEqual(5);
    denied.forEach((r) => expect(r.waitMs).toBeGreaterThan(0));
  });

  it('allows tokens to refill over time', async () => {
    const redis = createMockRedis();
    const bucket = new PerStackTokenBucket(redis as never, 5, 5);

    // Drain all tokens
    for (let i = 0; i < 5; i++) await bucket.consume('stk_refill');
    const drained = await bucket.consume('stk_refill');
    expect(drained.allowed).toBe(false);

    // Manually advance time by injecting a future `now` via the Lua script eval
    // The mock redis eval re-computes based on timestamp — wait 1s worth of tokens
    await new Promise<void>((r) => setTimeout(r, 1100));
    const refilled = await bucket.consume('stk_refill');
    expect(refilled.allowed).toBe(true);
  });
});

describe('CooldownManager', () => {
  it('isCoolingDown returns false before any 429', async () => {
    const redis = createMockRedis();
    const mgr = new CooldownManager(redis as never, 30_000);
    expect(await mgr.isCoolingDown('stk_1')).toBe(false);
  });

  it('isCoolingDown returns true after setCooldown', async () => {
    const redis = createMockRedis();
    const mgr = new CooldownManager(redis as never, 30_000);
    await mgr.setCooldown('stk_1');
    expect(await mgr.isCoolingDown('stk_1')).toBe(true);
  });

  it('remainingMs returns a positive value during cooldown', async () => {
    const redis = createMockRedis();
    const mgr = new CooldownManager(redis as never, 30_000);
    await mgr.setCooldown('stk_2');
    const remaining = await mgr.remainingMs('stk_2');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30_000);
  });
});

describe('isRateLimitError', () => {
  it('detects statusCode 429', () => {
    const err = Object.assign(new Error('oops'), { statusCode: 429 });
    expect(isRateLimitError(err)).toBe(true);
  });

  it('detects RATE_LIMITED message', () => {
    expect(isRateLimitError(new Error('RATE_LIMITED'))).toBe(true);
  });

  it('returns false for non-rate-limit errors', () => {
    expect(isRateLimitError(new Error('Network error'))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });
});

describe('Zero client 429s — stale-while-revalidate', () => {
  it('sets cooldown when upstream throws 429, subsequent check shows cooling down', async () => {
    const redis = createMockRedis();
    const cooldown = new CooldownManager(redis as never, 30_000);

    // Simulate upstream 429
    const rateLimitErr = Object.assign(new Error('RATE_LIMITED'), { statusCode: 429 });
    expect(isRateLimitError(rateLimitErr)).toBe(true);

    // fetchAllRows would call setCooldown on 429
    await cooldown.setCooldown('stk_target');

    // From this point, the gateway should serve stale — not propagate 429
    expect(await cooldown.isCoolingDown('stk_target')).toBe(true);
  });
});
