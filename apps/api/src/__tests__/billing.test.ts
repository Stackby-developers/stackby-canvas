import { describe, it, expect, beforeEach } from 'vitest';

describe('billing routes', () => {
  beforeEach(() => {
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
  });

  describe('POST /v1/billing/checkout', () => {
    it('returns 503 when STRIPE_SECRET_KEY is not set', async () => {
      // Clear any existing key
      delete process.env['STRIPE_SECRET_KEY'];
      const { default: app } = await import('../index.js');
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        payload: {
          workspaceId: 'ws-test',
          bundleId: 'credits_50',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      });
      expect(res.statusCode).toBe(503);
      const body = res.json() as { code: string };
      expect(body.code).toBe('BILLING_NOT_CONFIGURED');
    });

    it('returns 400 for unknown bundleId even when Stripe is configured', async () => {
      process.env['STRIPE_SECRET_KEY'] = 'sk_test_fake';
      const { default: app } = await import('../index.js');
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        payload: {
          workspaceId: 'ws-test',
          bundleId: 'credits_999999',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json() as { code: string };
      expect(body.code).toBe('INVALID_BUNDLE');
      delete process.env['STRIPE_SECRET_KEY'];
    });
  });

  describe('POST /v1/billing/webhook', () => {
    it('returns 503 when STRIPE_WEBHOOK_SECRET is not set', async () => {
      process.env['STRIPE_SECRET_KEY'] = 'sk_test_fake';
      delete process.env['STRIPE_WEBHOOK_SECRET'];
      const { default: app } = await import('../index.js');
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/webhook',
        headers: { 'content-type': 'application/json', 'stripe-signature': 'fake-sig' },
        payload: Buffer.from('{}'),
      });
      expect(res.statusCode).toBe(503);
      delete process.env['STRIPE_SECRET_KEY'];
    });

    it('returns 400 for invalid signature when Stripe is configured', async () => {
      process.env['STRIPE_SECRET_KEY'] = 'sk_test_fake';
      process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_fake';
      const { default: app } = await import('../index.js');
      const res = await app.inject({
        method: 'POST',
        url: '/v1/billing/webhook',
        headers: { 'content-type': 'application/json', 'stripe-signature': 'bad-signature' },
        payload: Buffer.from('{"type":"checkout.session.completed"}'),
      });
      expect(res.statusCode).toBe(400);
      const body = res.json() as { code: string };
      expect(body.code).toBe('INVALID_SIGNATURE');
      delete process.env['STRIPE_SECRET_KEY'];
      delete process.env['STRIPE_WEBHOOK_SECRET'];
    });
  });
});
