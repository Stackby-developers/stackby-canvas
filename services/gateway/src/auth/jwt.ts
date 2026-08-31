import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

export interface StudioSessionClaims extends JWTPayload {
  sub: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  email: string;
}

export interface ArtifactRuntimeClaims extends JWTPayload {
  sub: string;
  artifactId: string;
  stackId: string;
  bindingIds: string[];
  permissionScopeHash: string;
  workspaceId: string;
  email?: string;
}

export type VerifiedCaller =
  | { kind: 'studio'; claims: StudioSessionClaims }
  | { kind: 'artifact'; claims: ArtifactRuntimeClaims };

export class JwtVerifier {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async verify(token: string): Promise<VerifiedCaller> {
    const { payload } = await jwtVerify(token, this.secret);

    if ('artifactId' in payload && typeof payload['artifactId'] === 'string') {
      return { kind: 'artifact', claims: payload as ArtifactRuntimeClaims };
    }
    if ('workspaceId' in payload && typeof payload['workspaceId'] === 'string') {
      return { kind: 'studio', claims: payload as StudioSessionClaims };
    }
    throw new Error('Unrecognised token shape');
  }

  // Used in tests to mint tokens without a separate signing service
  async sign(payload: Record<string, unknown>, expiresIn = '1h'): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.secret);
  }
}
