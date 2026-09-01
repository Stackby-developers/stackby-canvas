export type ProjectStatus = 'draft' | 'published' | 'archived';

export type RunStatus =
  | 'pending'
  | 'intent'
  | 'schema'
  | 'clarification'
  | 'plan_review'
  | 'building'
  | 'verifying'
  | 'fixing'
  | 'ready'
  | 'failed';

export type ArtifactType =
  | 'dashboard'
  | 'portal'
  | 'report'
  | 'form'
  | 'gallery'
  | 'website'
  | 'document'
  | 'presentation';

export interface Project {
  id: string;
  name: string;
  stackId: string;
  status: ProjectStatus;
  artifactType: ArtifactType | null;
  createdAt: string;
  updatedAt: string;
  latestRunStatus: RunStatus | null;
}
