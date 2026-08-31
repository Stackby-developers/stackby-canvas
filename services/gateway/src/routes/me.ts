import type { FastifyInstance } from 'fastify';
import type { JwtVerifier } from '../auth/jwt.js';

export function registerMeRoute(app: FastifyInstance, verifier: JwtVerifier): void {
  app.get('/dg/v1/me', async (request, reply) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }
    let caller;
    try {
      caller = await verifier.verify(authHeader.slice(7));
    } catch {
      return reply.status(401).send({ code: 'UNAUTHORIZED' });
    }

    if (caller.kind === 'studio') {
      return reply.send({
        viewerId: caller.claims.sub,
        email: caller.claims.email,
        role: caller.claims.role,
        workspaceId: caller.claims.workspaceId,
      });
    }

    return reply.send({
      viewerId: caller.claims.sub,
      email: caller.claims.email ?? null,
      artifactId: caller.claims.artifactId,
      stackId: caller.claims.stackId,
    });
  });
}
