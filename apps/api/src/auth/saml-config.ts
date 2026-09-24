import type { Redis } from 'ioredis';

export interface SamlConfig {
  workspaceId: string;
  entryPoint: string;
  issuer: string;
  idpCert: string;
  workspacePat: string;
  attributeMapping: {
    email: string;
    userId: string;
  };
}

const KEY = (wsId: string) => `saml:config:${wsId}`;
const SESSION_KEY = (token: string) => `saml:session:${token}`;
const SESSION_TTL = 300; // 5 minutes

export class SamlConfigStore {
  constructor(private readonly redis: Redis) {}

  async get(workspaceId: string): Promise<SamlConfig | null> {
    const raw = await this.redis.get(KEY(workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as SamlConfig;
  }

  async save(config: SamlConfig): Promise<void> {
    await this.redis.set(KEY(config.workspaceId), JSON.stringify(config));
  }

  async delete(workspaceId: string): Promise<void> {
    await this.redis.del(KEY(workspaceId));
  }

  async storeSession(token: string, data: { pat: string; stacks: Array<{ id: string; name: string }>; email: string; workspaceId: string }): Promise<void> {
    await this.redis.set(SESSION_KEY(token), JSON.stringify(data), 'EX', SESSION_TTL);
  }

  async consumeSession(token: string): Promise<{ pat: string; stacks: Array<{ id: string; name: string }>; email: string; workspaceId: string } | null> {
    const raw = await this.redis.get(SESSION_KEY(token));
    if (!raw) return null;
    await this.redis.del(SESSION_KEY(token));
    return JSON.parse(raw) as { pat: string; stacks: Array<{ id: string; name: string }>; email: string; workspaceId: string };
  }
}
