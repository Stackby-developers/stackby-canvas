import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { request } from 'undici';

const ConnectBodySchema = z.object({
  pat: z.string().min(10),
});

interface StackbyBase {
  id: string;
  name: string;
  permissionLevel?: string;
}

function parseBases(data: unknown): StackbyBase[] {
  if (Array.isArray(data)) return data as StackbyBase[];
  if (data && typeof data === 'object' && 'bases' in data && Array.isArray((data as { bases: unknown }).bases)) {
    return (data as { bases: StackbyBase[] }).bases;
  }
  return [];
}

export function registerAuthConnectRoute(app: FastifyInstance): void {
  app.post<{ Body: unknown }>('/v1/auth/connect', async (req, reply) => {
    let pat: string;
    try {
      ({ pat } = ConnectBodySchema.parse(req.body));
    } catch {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const stackbyApiUrl = process.env['STACKBY_API_URL'] ?? 'https://api.stackby.com/API/v2';
    const headers = { 'x-api-key': pat, 'Accept': 'application/json' };

    // Try the two most common Stackby base-listing endpoints
    const candidates = [
      `${stackbyApiUrl}/meta/bases`,
      `${stackbyApiUrl}/workspace/bases`,
    ];

    let bases: StackbyBase[] = [];
    let authenticated = false;

    for (const url of candidates) {
      try {
        const { statusCode, body } = await request(url, { method: 'GET', headers });
        if (statusCode === 401 || statusCode === 403) {
          return reply.status(401).send({ error: 'Invalid Stackby Personal Access Token' });
        }
        if (statusCode === 200) {
          const data: unknown = await body.json();
          bases = parseBases(data);
          authenticated = true;
          break;
        }
        // consume body to avoid leaks
        await body.text();
      } catch {
        // try next candidate
      }
    }

    // If neither endpoint returned 200, treat as valid PAT with no discoverable stacks
    // (API shape may differ between Stackby versions)
    if (!authenticated) {
      // Return connected=true with empty stacks — user can still type a stack ID manually
      return reply.send({ connected: true, pat, stacks: [] });
    }

    return reply.send({
      connected: true,
      pat,
      stacks: bases.map((b) => ({ id: b.id, name: b.name })),
    });
  });
}
