import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import {
  VisibilityModeSchema,
  ArtifactPermissionsSchema,
  PublishConfirmationSchema,
} from '../deployment/types.js';
import { publishVersion } from '../deployment/publish.js';
import type { Config } from '../config.js';

const PublishBodySchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  artifactId: z.string(),
  versionId: z.string(),
  buildHash: z.string(),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/).optional(),
  visibility: VisibilityModeSchema.default('stack_collaborators'),
  permissions: ArtifactPermissionsSchema.default({
    camera: false, clipboardRead: false, clipboardWrite: false, geolocation: false,
  }),
  confirmation: PublishConfirmationSchema.optional(),
  publishedByUserId: z.string().default('system'),
});

export function registerPublishRoute(
  app: FastifyInstance,
  pool: Pool,
  redis: Redis,
  config: Config,
): void {
  app.post('/publish', async (request, reply) => {
    const body = PublishBodySchema.parse(request.body);
    const result = await publishVersion({ ...body }, pool, redis, config.STUDIO_DOMAIN);
    return reply.status(201).send(result);
  });
}
