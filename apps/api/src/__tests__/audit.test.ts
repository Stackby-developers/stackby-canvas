import { describe, it, expect, vi } from 'vitest';
import { computeChainHash, AuditLog } from '../audit/chain.js';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

function makeEntry(overrides = {}) {
  return {
    id: randomUUID(),
    workspaceId: 'ws1',
    actorId: 'user1',
    action: 'artifact.publish',
    resourceType: 'artifact',
    resourceId: 'art_1',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('hash chain', () => {
  it('produces a 64-char hex hash', () => {
    const hash = computeChainHash(GENESIS, makeEntry());
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('is deterministic — same inputs → same hash', () => {
    const entry = makeEntry();
    expect(computeChainHash(GENESIS, entry)).toBe(computeChainHash(GENESIS, entry));
  });

  it('different previous hash → different chain hash', () => {
    const entry = makeEntry();
    expect(computeChainHash(GENESIS, entry)).not.toBe(computeChainHash('a'.repeat(64), entry));
  });

  it('changing any field changes the hash (tampering detection)', () => {
    const entry = makeEntry();
    const h1 = computeChainHash(GENESIS, entry);
    const h2 = computeChainHash(GENESIS, { ...entry, action: 'artifact.delete' });
    expect(h1).not.toBe(h2);
  });
});

describe('AuditLog export', () => {
  const fakePool = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as Pool;

  it('exportCsv: header + one row per entry', () => {
    const log = new AuditLog(fakePool);
    const csv = log.exportCsv([{ ...makeEntry(), chainHash: GENESIS }]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('id,workspaceId');
    expect(lines).toHaveLength(2);
  });

  it('exportJson: valid JSON per line', () => {
    const log = new AuditLog(fakePool);
    const entry = { ...makeEntry(), chainHash: GENESIS };
    const jsonl = log.exportJson([entry]);
    const parsed = JSON.parse(jsonl) as typeof entry;
    expect(parsed.id).toBe(entry.id);
    expect(parsed.chainHash).toBe(GENESIS);
  });
});
