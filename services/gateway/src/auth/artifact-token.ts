// Artifact token minting helpers — used by the publish service when deploying an artifact.
// The gateway only verifies; minting lives here for reuse by other services.

export interface ArtifactTokenPayload {
  sub: string;
  artifactId: string;
  stackId: string;
  bindingIds: string[];
  permissionScopeHash: string;
  workspaceId: string;
  email?: string;
}

export function buildArtifactTokenPayload(p: ArtifactTokenPayload): Record<string, unknown> {
  return { ...p };
}
