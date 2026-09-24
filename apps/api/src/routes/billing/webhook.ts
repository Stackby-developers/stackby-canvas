import Stripe from 'stripe';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Config } from '../../config.js';
import { CreditLedger } from '../../credit/ledger.js';

export function registerWebhookRoute(app: FastifyInstance, pool: Pool, config: Config): void {
  // Scoped plugin so the raw buffer content-type parser doesn't affect other routes
  void app.register(async (instance) => {
    instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    instance.post('/v1/billing/webhook', async (request, reply) => {
      if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) {
        return reply.status(503).send({ code: 'BILLING_NOT_CONFIGURED' });
      }

      const sig = request.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        return reply.status(400).send({ code: 'MISSING_SIGNATURE' });
      }

      const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          request.body as Buffer,
          sig,
          config.STRIPE_WEBHOOK_SECRET,
        );
      } catch {
        return reply.status(400).send({ code: 'INVALID_SIGNATURE' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { workspaceId, credits } = session.metadata ?? {};
        if (workspaceId && credits) {
          const ledger = new CreditLedger(pool);
          await ledger.credit({
            workspaceId,
            amount: parseInt(credits, 10),
            reason: 'Stripe purchase',
          });
        }
      }

      return reply.send({ received: true });
    });
  });
}
