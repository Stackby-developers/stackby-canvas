import { describe, it, expect } from 'vitest';
import { checkVisibility } from '../visibility/check.js';
import { createHash } from 'node:crypto';
import type { Deployment } from '../deployment/types.js';

function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: 'd1',
    workspaceId: 'ws1',
    projectId: 'p1',
    artifactId: 'a1',
    slug: 'test',
    visibility: 'stack_collaborators',
    activeVersionId: 'v1',
    permissions: { camera: false, clipboardRead: false, clipboardWrite: false, geolocation: false },
    publishedAt: new Date(),
    ...overrides,
  };
}

const VIEWER = { sub: 'u1', email: 'a@test.com', workspaceId: 'ws1', stackbyToken: 'tok' };

describe('visibility check', () => {
  it('public — allows unauthenticated viewer', () => {
    expect(checkVisibility(makeDeployment({ visibility: 'public' }), null).allowed).toBe(true);
  });

  it('link — allows unauthenticated viewer', () => {
    expect(checkVisibility(makeDeployment({ visibility: 'link' }), null).allowed).toBe(true);
  });

  it('stack_collaborators — requires auth (unauthenticated → denied)', () => {
    const result = checkVisibility(makeDeployment({ visibility: 'stack_collaborators' }), null);
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('unauthenticated');
  });

  it('stack_collaborators — allows authenticated viewer', () => {
    expect(checkVisibility(makeDeployment(), VIEWER).allowed).toBe(true);
  });

  it('workspace — rejects viewer from different workspace', () => {
    const result = checkVisibility(
      makeDeployment({ visibility: 'workspace', workspaceId: 'ws2' }),
      VIEWER,
    );
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('forbidden');
  });

  it('workspace — allows viewer from same workspace', () => {
    expect(checkVisibility(makeDeployment({ visibility: 'workspace' }), VIEWER).allowed).toBe(true);
  });

  it('workspace — unauthenticated viewer gets unauthenticated reason', () => {
    const result = checkVisibility(makeDeployment({ visibility: 'workspace' }), null);
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('unauthenticated');
  });

  it('password — no attempt → password_required', () => {
    const hash = createHash('sha256').update('secret').digest('hex');
    const result = checkVisibility(makeDeployment({ visibility: 'password', passwordHash: hash }), null);
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('password_required');
  });

  it('password — wrong attempt → forbidden', () => {
    const hash = createHash('sha256').update('secret').digest('hex');
    const result = checkVisibility(makeDeployment({ visibility: 'password', passwordHash: hash }), null, 'wrong');
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('forbidden');
  });

  it('password — correct attempt → allowed', () => {
    const hash = createHash('sha256').update('secret').digest('hex');
    expect(checkVisibility(makeDeployment({ visibility: 'password', passwordHash: hash }), null, 'secret').allowed).toBe(true);
  });

  it('unpublished deployment — always denied regardless of visibility', () => {
    const result = checkVisibility(makeDeployment({ visibility: 'public', unpublishedAt: new Date() }), null);
    expect(result.allowed).toBe(false);
    expect((result as { reason: string }).reason).toBe('unpublished');
  });

  it('unpublished stack_collaborators deployment — denied even with valid viewer', () => {
    const result = checkVisibility(makeDeployment({ unpublishedAt: new Date() }), VIEWER);
    expect(result.allowed).toBe(false);
  });
});
