import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type Redis from 'ioredis';
import { exchangeCode } from '../auth/sso.js';
import { SessionManager } from '../auth/session.js';
import type { Config } from '../config.js';

const CallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});

export function registerAuthCallbackRoute(
  app: FastifyInstance,
  redis: Redis,
  config: Config,
): void {
  const sessions = new SessionManager(config.JWT_SECRET, config.SESSION_TTL_SECONDS);

  app.get<{ Querystring: unknown }>('/auth/callback', async (request, reply) => {
    const { code, state } = CallbackQuerySchema.parse(request.query);

    const pkceData = await redis.get(`pkce:${state}`);
    if (!pkceData) {
      return reply.status(400).send({ error: 'Invalid or expired state parameter' });
    }
    await redis.del(`pkce:${state}`);

    const { codeVerifier, returnTo } = JSON.parse(pkceData) as {
      codeVerifier: string;
      returnTo: string;
    };

    const redirectUri = `${request.protocol}://${request.hostname}/auth/callback`;
    const viewer = await exchangeCode(config, code, codeVerifier, redirectUri);

    await sessions.create(
      { sub: viewer.userId, email: viewer.email, name: viewer.name, stackbyToken: viewer.accessToken },
      reply,
    );

    return reply.redirect(returnTo || '/');
  });
}
