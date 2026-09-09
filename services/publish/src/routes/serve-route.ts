import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { resolveSlug } from '../routing/slug.js';
import { buildSecurityHeaders } from '../csp/builder.js';
import { loadingStateHtml } from '../runtime/loading-state.js';
import { SessionManager } from '../auth/session.js';
import { checkVisibility } from '../visibility/check.js';
import type { Config } from '../config.js';

export function registerServeRoute(
  app: FastifyInstance,
  pool: Pool,
  redis: Redis,
  config: Config,
): void {
  const sessions = new SessionManager(config.JWT_SECRET, config.SESSION_TTL_SECONDS);

  app.get<{ Params: { slug: string; '*': string } }>(
    '/serve/:slug/*',
    async (request, reply) => {
      const { slug } = request.params;
      const deployment = await resolveSlug(slug, pool, redis);

      if (!deployment) {
        return reply.status(404).send({ error: 'Deployment not found' });
      }
      if (deployment.unpublishedAt) {
        return reply.status(410).send({ error: 'This artifact has been unpublished' });
      }

      // Enforce visibility before serving any content.
      if (deployment.visibility === 'password') {
        const cookies = request.cookies as Record<string, string | undefined>;
        const accessCookie = cookies[`__ap_${deployment.id}`];
        if (!accessCookie || accessCookie !== deployment.passwordHash) {
          return reply.status(401).send({ error: 'password_required', slug });
        }
      } else {
        const viewer = await sessions.verify(request);
        const result = checkVisibility(deployment, viewer);
        if (!result.allowed) {
          const status = result.reason === 'unpublished' ? 410 : 401;
          return reply.status(status).send({ error: result.reason });
        }
      }

      const headers = buildSecurityHeaders(config.GATEWAY_ORIGIN, deployment.permissions);
      for (const [key, value] of Object.entries(headers)) {
        reply.header(key, value);
      }

      // Cache strategy: public/link artifacts are content-addressed and safe to
      // cache at the edge. Private artifacts must never be cached by a CDN.
      if (deployment.visibility === 'public' || deployment.visibility === 'link') {
        reply.header('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
        reply.header('CDN-Cache-Control', 'public, max-age=3600');
        reply.header('ETag', `"${deployment.activeVersionId}"`);
        const ifNoneMatch = (request.headers as Record<string, string | undefined>)['if-none-match'];
        if (ifNoneMatch === `"${deployment.activeVersionId}"`) {
          return reply.status(304).send();
        }
      } else {
        reply.header('Cache-Control', 'private, no-store');
      }

      const runtimeScriptUrl = `/runtime/${deployment.activeVersionId}/main.js`;
      return reply.type('text/html').send(loadingStateHtml(runtimeScriptUrl, 'pending'));
    },
  );
}
