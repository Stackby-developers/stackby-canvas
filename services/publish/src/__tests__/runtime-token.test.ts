import { describe, it, expect } from 'vitest';
import { issueRuntimeToken } from '../auth/runtime-token.js';
import { jwtVerify } from 'jose';

const SECRET = 'this-is-a-test-secret-minimum-32-chars!!';

const BASE_PAYLOAD = {
  sub: 'u1',
  email: 'a@test.com',
  artifactId: 'art1',
  stackId: 'stk1',
  workspaceId: 'ws1',
  permissionScopeHash: 'abc123',
  bindingIds: ['binding1'],
  deploymentId: 'dep1',
  visibility: 'stack_collaborators',
} as const;

describe('runtime token', () => {
  it('issues a verifiable JWT with correct claims', async () => {
    const token = await issueRuntimeToken(BASE_PAYLOAD, SECRET, 3600);
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
    expect(payload['sub']).toBe('u1');
    expect(payload['artifactId']).toBe('art1');
    expect(payload['permissionScopeHash']).toBe('abc123');
    expect(payload['workspaceId']).toBe('ws1');
  });

  it('token carries only a scope hash — no raw permission tables/columns', async () => {
    const token = await issueRuntimeToken(BASE_PAYLOAD, SECRET, 3600);
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
    expect(payload['visibleTableIds']).toBeUndefined();
    expect(payload['visibleColumnIds']).toBeUndefined();
    expect(typeof payload['permissionScopeHash']).toBe('string');
  });

  it('expired token fails verification', async () => {
    const token = await issueRuntimeToken({ ...BASE_PAYLOAD }, SECRET, 1);
    await new Promise((r) => setTimeout(r, 1100));
    await expect(jwtVerify(token, new TextEncoder().encode(SECRET))).rejects.toThrow();
  }, 5000);

  it('token signed with different secret fails verification', async () => {
    const token = await issueRuntimeToken(BASE_PAYLOAD, SECRET, 3600);
    const wrong = new TextEncoder().encode('wrong-secret-also-32-chars-long!!');
    await expect(jwtVerify(token, wrong)).rejects.toThrow();
  });

  it('two different viewers get different tokens', async () => {
    const t1 = await issueRuntimeToken({ ...BASE_PAYLOAD, sub: 'u1', permissionScopeHash: 'hash_a' }, SECRET, 3600);
    const t2 = await issueRuntimeToken({ ...BASE_PAYLOAD, sub: 'u2', permissionScopeHash: 'hash_b' }, SECRET, 3600);
    expect(t1).not.toBe(t2);
  });
});
