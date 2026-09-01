import { createHash } from 'node:crypto';
import type { Deployment } from '../deployment/types.js';
import type { SessionPayload } from '../auth/session.js';

export type VisibilityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'forbidden' | 'password_required' | 'unpublished' };

/**
 * Check whether a viewer may access a deployment.
 * Permission inheritance (row/column access) is enforced at the gateway.
 * This check only controls whether the viewer may see the artifact at all.
 */
export function checkVisibility(
  deployment: Deployment,
  viewer: SessionPayload | null,
  passwordAttempt?: string,
): VisibilityCheckResult {
  if (deployment.unpublishedAt) {
    return { allowed: false, reason: 'unpublished' };
  }

  switch (deployment.visibility) {
    case 'public':
      return { allowed: true };

    case 'link':
      return { allowed: true };

    case 'password': {
      if (!passwordAttempt) return { allowed: false, reason: 'password_required' };
      if (!deployment.passwordHash) return { allowed: false, reason: 'forbidden' };
      const hash = createHash('sha256').update(passwordAttempt).digest('hex');
      return hash === deployment.passwordHash
        ? { allowed: true }
        : { allowed: false, reason: 'forbidden' };
    }

    case 'workspace':
      if (!viewer) return { allowed: false, reason: 'unauthenticated' };
      return viewer.workspaceId === deployment.workspaceId
        ? { allowed: true }
        : { allowed: false, reason: 'forbidden' };

    case 'stack_collaborators':
    default:
      if (!viewer) return { allowed: false, reason: 'unauthenticated' };
      return { allowed: true };
  }
}
