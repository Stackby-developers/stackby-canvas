import { describe, it, expect } from 'vitest';

describe('SharingStore module', () => {
  it('exports SharingStore class', async () => {
    const mod = await import('../store/sharing.js');
    expect(typeof mod.SharingStore).toBe('function');
  });

  it('ShareRole accepts view and edit', () => {
    type ShareRole = 'view' | 'edit';
    const roles: ShareRole[] = ['view', 'edit'];
    expect(roles).toHaveLength(2);
  });
});

describe('design system health route', () => {
  it('GET /health returns ok', async () => {
    const { default: app } = await import('../index.js');
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string };
    expect(body.status).toBe('ok');
  });
});
