import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type Redis from 'ioredis';
import { generatePKCE, buildAuthUrl } from '../auth/sso.js';
import type { Config } from '../config.js';

const QuerySchema = z.object({ returnTo: z.string().optional() });

export function registerAuthStartRoute(
  app: FastifyInstance,
  redis: Redis,
  config: Config,
): void {
  app.get<{ Querystring: unknown }>('/auth/start', async (request, reply) => {
    const { returnTo } = QuerySchema.parse(request.query);
    const pkce = generatePKCE();

    await redis.set(
      `pkce:${pkce.state}`,
      JSON.stringify({ codeVerifier: pkce.codeVerifier, returnTo: returnTo ?? '/' }),
      'EX',
      600,
    );

    const redirectUri = `${request.protocol}://${request.hostname}/auth/callback`;
    const authUrl = buildAuthUrl(config, pkce, redirectUri);

    return reply.redirect(authUrl);
  });
}
