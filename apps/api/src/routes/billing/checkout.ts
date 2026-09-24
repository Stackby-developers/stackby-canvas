import { z } from 'zod';
import Stripe from 'stripe';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';
import { findBundle } from '../../billing/bundles.js';

const Body = z.object({
  workspaceId: z.string().min(1),
  bundleId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export function registerCheckoutRoute(app: FastifyInstance, config: Config): void {
  app.post('/v1/billing/checkout', async (request, reply) => {
    if (!config.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ code: 'BILLING_NOT_CONFIGURED', message: 'Stripe is not configured on this server.' });
    }

    let body;
    try {
      body = Body.parse(request.body);
    } catch (err) {
      return reply.status(400).send({ code: 'INVALID_BODY', message: String(err) });
    }

    const bundle = findBundle(body.bundleId);
    if (!bundle) {
      return reply.status(400).send({ code: 'INVALID_BUNDLE', message: `Unknown bundleId: ${body.bundleId}` });
    }

    if (!bundle.stripePriceId) {
      return reply.status(503).send({ code: 'BILLING_NOT_CONFIGURED', message: `Stripe price ID for bundle ${body.bundleId} is not set.` });
    }

    const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: bundle.stripePriceId, quantity: 1 }],
      metadata: {
        workspaceId: body.workspaceId,
        bundleId: body.bundleId,
        credits: String(bundle.credits),
      },
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
    });

    return reply.send({ url: session.url });
  });
}
