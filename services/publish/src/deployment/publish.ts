import type { Pool } from 'pg';
import type Redis from 'ioredis';
import type { VisibilityMode, ArtifactPermissions, PublishConfirmation } from './types.js';
import { DeploymentStore } from './store.js';
import { computeContentAddress, storageKeyFromAddress } from './content-address.js';
import { auditPublish } from '../visibility/audit.js';
import { randomUUID } from 'node:crypto';

export interface PublishInput {
  workspaceId: string;
  projectId: string;
  artifactId: string;
  versionId: string;
  buildHash: string;
  slug?: string;
  visibility: VisibilityMode;
  permissions: ArtifactPermissions;
  publishedByUserId: string;
  confirmation?: PublishConfirmation;
}

export interface PublishResult {
  deploymentId: string;
  versionId: string;
  previewUrl: string;
  contentAddress: string;
  publishedAt: Date;
}

export async function publishVersion(
  input: PublishInput,
  pool: Pool,
  redis: Redis,
  studioDomain: string,
): Promise<PublishResult> {
  if ((input.visibility === 'link' || input.visibility === 'public') && !input.confirmation) {
    throw Object.assign(
      new Error('Publish confirmation required for link or public visibility'),
      { code: 'CONFIRMATION_REQUIRED', httpStatus: 422 },
    );
  }

  const store = new DeploymentStore(pool);
  const slug = input.slug ?? generateSlug();

  const existing = await store.getBySlug(slug);
  if (existing) {
    throw Object.assign(
      new Error(`Slug "${slug}" is already in use`),
      { code: 'SLUG_TAKEN', httpStatus: 409 },
    );
  }

  const contentAddress = computeContentAddress(input.artifactId, input.versionId, input.buildHash);
  const storageKey = storageKeyFromAddress(contentAddress);

  const deployment = await store.createDeployment({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    artifactId: input.artifactId,
    slug,
    visibility: input.visibility,
    permissions: input.permissions,
    createdByUserId: input.publishedByUserId,
    publishConfirmation: input.confirmation,
  });

  const version = await store.createVersion({
    deploymentId: deployment.id,
    versionNumber: 1,
    buildHash: input.buildHash,
    contentAddress,
    storageKey,
    createdByUserId: input.publishedByUserId,
  });

  if (input.visibility === 'link' || input.visibility === 'public') {
    await auditPublish(pool, {
      workspaceId: input.workspaceId,
      deploymentId: deployment.id,
      actorId: input.publishedByUserId,
      visibility: input.visibility,
      confirmation: input.confirmation!,
    });
  }

  await redis.set(`slug:${slug}`, JSON.stringify(deployment), 'EX', 60);

  const previewUrl = `https://${slug}.${studioDomain}`;
  return {
    deploymentId: deployment.id,
    versionId: version.id,
    previewUrl,
    contentAddress,
    publishedAt: deployment.publishedAt,
  };
}

function generateSlug(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8).toLowerCase();
}
