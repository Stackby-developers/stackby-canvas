import { z } from 'zod';

export const VisibilityModeSchema = z.enum([
  'stack_collaborators',
  'workspace',
  'link',
  'password',
  'public',
]);
export type VisibilityMode = z.infer<typeof VisibilityModeSchema>;

export const ArtifactPermissionsSchema = z.object({
  camera: z.boolean().default(false),
  clipboardRead: z.boolean().default(false),
  clipboardWrite: z.boolean().default(false),
  geolocation: z.boolean().default(false),
});
export type ArtifactPermissions = z.infer<typeof ArtifactPermissionsSchema>;

export const PublishConfirmationSchema = z.object({
  tablesBecomingReadable: z.array(z.object({ tableId: z.string(), tableName: z.string() })),
  columnsBecomingReadable: z.array(z.object({
    columnId: z.string(),
    columnName: z.string(),
    tableId: z.string(),
  })),
  confirmedByUserId: z.string(),
  confirmedAt: z.string().datetime(),
});
export type PublishConfirmation = z.infer<typeof PublishConfirmationSchema>;

export interface DeploymentVersion {
  id: string;
  deploymentId: string;
  versionNumber: number;
  buildHash: string;
  contentAddress: string;
  storageKey: string;
  createdAt: Date;
  createdByUserId: string;
}

export interface Deployment {
  id: string;
  workspaceId: string;
  projectId: string;
  artifactId: string;
  slug: string;
  customDomain?: string;
  visibility: VisibilityMode;
  passwordHash?: string;
  activeVersionId: string;
  permissions: ArtifactPermissions;
  publishConfirmation?: PublishConfirmation;
  publishedAt: Date;
  unpublishedAt?: Date;
  unpublishedByUserId?: string;
}
