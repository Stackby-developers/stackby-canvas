import type { Pool } from 'pg';
import type { Deployment, DeploymentVersion, VisibilityMode, ArtifactPermissions, PublishConfirmation } from './types.js';
import { randomUUID } from 'node:crypto';

export class DeploymentStore {
  constructor(private readonly pool: Pool) {}

  async createDeployment(input: {
    workspaceId: string;
    projectId: string;
    artifactId: string;
    slug: string;
    visibility: VisibilityMode;
    permissions: ArtifactPermissions;
    createdByUserId: string;
    publishConfirmation?: PublishConfirmation;
    passwordHash?: string;
  }): Promise<Deployment> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO deployments
       (id, workspace_id, project_id, artifact_id, slug, visibility, permissions,
        publish_confirmation, password_hash, active_version_id, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'',NOW())`,
      [
        id, input.workspaceId, input.projectId, input.artifactId,
        input.slug, input.visibility,
        JSON.stringify(input.permissions),
        input.publishConfirmation ? JSON.stringify(input.publishConfirmation) : null,
        input.passwordHash ?? null,
      ],
    );
    return (await this.getById(id))!;
  }

  async createVersion(input: {
    deploymentId: string;
    versionNumber: number;
    buildHash: string;
    contentAddress: string;
    storageKey: string;
    createdByUserId: string;
  }): Promise<DeploymentVersion> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO deployment_versions
       (id, deployment_id, version_number, build_hash, content_address, storage_key, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [id, input.deploymentId, input.versionNumber, input.buildHash,
       input.contentAddress, input.storageKey, input.createdByUserId],
    );
    await this.pool.query(
      `UPDATE deployments SET active_version_id=$1 WHERE id=$2`,
      [id, input.deploymentId],
    );
    return (await this.getVersionById(id))!;
  }

  async getById(id: string): Promise<Deployment | null> {
    const { rows } = await this.pool.query(`SELECT * FROM deployments WHERE id=$1`, [id]);
    return rows[0] ? this.rowToDeployment(rows[0] as Record<string, unknown>) : null;
  }

  async getBySlug(slug: string): Promise<Deployment | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM deployments WHERE slug=$1 AND unpublished_at IS NULL`,
      [slug],
    );
    return rows[0] ? this.rowToDeployment(rows[0] as Record<string, unknown>) : null;
  }

  async getByCustomDomain(domain: string): Promise<Deployment | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM deployments WHERE custom_domain=$1 AND unpublished_at IS NULL`,
      [domain],
    );
    return rows[0] ? this.rowToDeployment(rows[0] as Record<string, unknown>) : null;
  }

  async getVersionById(id: string): Promise<DeploymentVersion | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM deployment_versions WHERE id=$1`, [id],
    );
    return rows[0] ? this.rowToVersion(rows[0] as Record<string, unknown>) : null;
  }

  async listVersions(deploymentId: string): Promise<DeploymentVersion[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM deployment_versions WHERE deployment_id=$1 ORDER BY version_number DESC`,
      [deploymentId],
    );
    return rows.map((r) => this.rowToVersion(r as Record<string, unknown>));
  }

  async setActiveVersion(deploymentId: string, versionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE deployments SET active_version_id=$1 WHERE id=$2`,
      [versionId, deploymentId],
    );
  }

  async unpublish(deploymentId: string, byUserId: string): Promise<void> {
    await this.pool.query(
      `UPDATE deployments SET unpublished_at=NOW(), unpublished_by=$1 WHERE id=$2`,
      [byUserId, deploymentId],
    );
  }

  private rowToDeployment(row: Record<string, unknown>): Deployment {
    return {
      id: row['id'] as string,
      workspaceId: row['workspace_id'] as string,
      projectId: row['project_id'] as string,
      artifactId: row['artifact_id'] as string,
      slug: row['slug'] as string,
      customDomain: row['custom_domain'] as string | undefined,
      visibility: row['visibility'] as VisibilityMode,
      passwordHash: row['password_hash'] as string | undefined,
      activeVersionId: row['active_version_id'] as string,
      permissions: JSON.parse(row['permissions'] as string) as ArtifactPermissions,
      publishConfirmation: row['publish_confirmation']
        ? JSON.parse(row['publish_confirmation'] as string) as PublishConfirmation
        : undefined,
      publishedAt: new Date(row['published_at'] as string),
      unpublishedAt: row['unpublished_at']
        ? new Date(row['unpublished_at'] as string)
        : undefined,
      unpublishedByUserId: row['unpublished_by'] as string | undefined,
    };
  }

  private rowToVersion(row: Record<string, unknown>): DeploymentVersion {
    return {
      id: row['id'] as string,
      deploymentId: row['deployment_id'] as string,
      versionNumber: row['version_number'] as number,
      buildHash: row['build_hash'] as string,
      contentAddress: row['content_address'] as string,
      storageKey: row['storage_key'] as string,
      createdAt: new Date(row['created_at'] as string),
      createdByUserId: row['created_by'] as string,
    };
  }
}
