import { describe, it, expect } from 'vitest';
import { computeContentAddress, storageKeyFromAddress } from '../deployment/content-address.js';

describe('content addressing', () => {
  it('is deterministic', () => {
    const a = computeContentAddress('art_1', 'v_1', 'hash_1');
    const b = computeContentAddress('art_1', 'v_1', 'hash_1');
    expect(a).toBe(b);
  });

  it('produces different addresses for different build hashes', () => {
    const a = computeContentAddress('art_1', 'v_1', 'hash_1');
    const b = computeContentAddress('art_1', 'v_1', 'hash_2');
    expect(a).not.toBe(b);
  });

  it('produces different addresses for different artifact IDs', () => {
    const a = computeContentAddress('art_1', 'v_1', 'hash_1');
    const b = computeContentAddress('art_2', 'v_1', 'hash_1');
    expect(a).not.toBe(b);
  });

  it('is 64 hex chars (full SHA-256)', () => {
    const addr = computeContentAddress('x', 'y', 'z');
    expect(addr).toHaveLength(64);
    expect(addr).toMatch(/^[a-f0-9]+$/);
  });

  it('storage key starts with 2-char shard prefix', () => {
    const addr = computeContentAddress('art_1', 'v_1', 'hash_1');
    const key = storageKeyFromAddress(addr);
    expect(key).toMatch(/^artifacts\/[a-f0-9]{2}\//);
    expect(key).toContain(addr);
  });

  it('different content addresses map to different storage keys', () => {
    const a = storageKeyFromAddress(computeContentAddress('art_1', 'v_1', 'h1'));
    const b = storageKeyFromAddress(computeContentAddress('art_1', 'v_1', 'h2'));
    expect(a).not.toBe(b);
  });
});
