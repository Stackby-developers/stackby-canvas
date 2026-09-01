import { SignJWT } from 'jose';

export interface RuntimeTokenPayload {
  sub: string;
  email: string;
  artifactId: string;
  stackId: string;
  workspaceId: string;
  permissionScopeHash: string;
  bindingIds: string[];
  deploymentId: string;
  visibility: string;
}

/**
 * Issue a gateway-scoped runtime JWT for a viewer of a published artifact.
 * The token is scoped to the viewer's own permissions — never broader.
 * The permissionScopeHash must be computed by the gateway for this viewer.
 */
export async function issueRuntimeToken(
  payload: RuntimeTokenPayload,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}
