import type { VerifiedCaller } from '../auth/jwt.js';
import type { ViewerScope } from './scope-hash.js';
import { computePermissionScopeHash } from './scope-hash.js';

export interface ResolvedPermissions {
  scope: ViewerScope;
  scopeHash: string;
}

export async function resolvePermissions(
  caller: VerifiedCaller,
  requestedStackId: string,
): Promise<ResolvedPermissions> {
  if (caller.kind === 'artifact') {
    const { claims } = caller;
    if (claims.stackId !== requestedStackId) {
      throw Object.assign(new Error('Stack mismatch'), { statusCode: 403, code: 'STACK_MISMATCH' });
    }
    // Artifact tokens carry a pre-computed scope hash signed at publish time — trust it
    const scope: ViewerScope = {
      viewerId: claims.sub,
      stackId: requestedStackId,
      visibleTableIds: [],
      visibleViewIds: [],
      visibleColumnIds: [],
    };
    return { scope, scopeHash: claims.permissionScopeHash };
  }

  // Studio session: full access (would call Stackby permissions API in production)
  const scope: ViewerScope = {
    viewerId: caller.claims.sub,
    stackId: requestedStackId,
    visibleTableIds: ['*'],
    visibleViewIds: ['*'],
    visibleColumnIds: ['*'],
  };
  return { scope, scopeHash: computePermissionScopeHash(scope) };
}
