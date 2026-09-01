import { SignJWT, jwtVerify } from 'jose';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface SessionPayload {
  sub: string;
  email: string;
  name?: string;
  workspaceId?: string;
  stackbyToken: string;
}

export class SessionManager {
  private readonly secret: Uint8Array;

  constructor(secret: string, private readonly ttlSeconds: number) {
    this.secret = new TextEncoder().encode(secret);
  }

  async create(payload: SessionPayload, reply: FastifyReply): Promise<void> {
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.ttlSeconds}s`)
      .sign(this.secret);

    reply.setCookie('__studio_session', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: this.ttlSeconds,
      path: '/',
    });
  }

  async verify(request: FastifyRequest): Promise<SessionPayload | null> {
    const token = (request.cookies as Record<string, string | undefined>)['__studio_session'];
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as unknown as SessionPayload;
    } catch {
      return null;
    }
  }

  clear(reply: FastifyReply): void {
    reply.clearCookie('__studio_session', { path: '/' });
  }
}
