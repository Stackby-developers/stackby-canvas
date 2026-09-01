import { describe, it, expect } from 'vitest';

describe('api health', () => {
  it('GET /health returns ok', async () => {
    const { default: app } = await import('../index.js');
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string };
    expect(body.status).toBe('ok');
  });
});

describe('CreditCapError full shape', () => {
  it('has all required fields', async () => {
    const { CreditCapError } = await import('../credit/limits.js');
    const err = new CreditCapError('ws1', 490, 500, 'run_xyz', 'wf_123');
    expect(err.code).toBe('CREDIT_CAP_EXCEEDED');
    expect(err.httpStatus).toBe(402);
    expect(err.retryable).toBe(false);
    expect(err.userMessage.length).toBeGreaterThan(10);
    expect(err.resumeInstructions.length).toBeGreaterThan(10);
    // userMessage tells the user where their run is
    expect(err.userMessage).toContain('run_xyz');
    // resumeInstructions tell them how to get back
    expect(err.resumeInstructions).toContain('wf_123');
  });
});
