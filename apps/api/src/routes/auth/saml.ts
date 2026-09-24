import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { request as undiciRequest } from 'undici';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { Config } from '../../config.js';
import { SamlConfigStore } from '../../auth/saml-config.js';

const SaveConfigBody = z.object({
  workspaceId: z.string().min(1),
  entryPoint: z.string().url(),
  issuer: z.string().min(1),
  idpCert: z.string().min(1),
  workspacePat: z.string().min(10),
  attributeMapping: z.object({
    email: z.string().default('email'),
    userId: z.string().default('uid'),
  }).default({ email: 'email', userId: 'uid' }),
});

function buildAuthnRequest(spEntityId: string, callbackUrl: string, idpEntryPoint: string): string {
  const id = `_${randomUUID().replace(/-/g, '')}`;
  const issueInstant = new Date().toISOString();
  const xml = `<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${idpEntryPoint}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
    AssertionConsumerServiceURL="${callbackUrl}">
    <saml:Issuer>${spEntityId}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
  </samlp:AuthnRequest>`;
  const b64 = Buffer.from(xml).toString('base64');
  const encoded = encodeURIComponent(b64);
  return `${idpEntryPoint}?SAMLRequest=${encoded}`;
}

function extractAttribute(attributesNode: unknown, name: string): string | null {
  if (typeof attributesNode !== 'object' || attributesNode === null) return null;
  const val = (attributesNode as Record<string, unknown>)[name];
  if (Array.isArray(val)) return String(val[0] ?? '');
  if (typeof val === 'string') return val;
  return null;
}

function parseNameId(samlXml: string): string | null {
  const match = /<(?:[^:]+:)?NameID[^>]*>([^<]+)<\/(?:[^:]+:)?NameID>/.exec(samlXml);
  return match?.[1]?.trim() ?? null;
}

function parseAttributes(samlXml: string): Record<string, string[]> {
  const attrs: Record<string, string[]> = {};
  const attrRegex = /<(?:[^:]+:)?Attribute[^>]+Name="([^"]+)"[^>]*>([\s\S]*?)<\/(?:[^:]+:)?Attribute>/g;
  const valueRegex = /<(?:[^:]+:)?AttributeValue[^>]*>([^<]+)<\/(?:[^:]+:)?AttributeValue>/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(samlXml)) !== null) {
    const attrName = attrMatch[1] ?? '';
    const attrBlock = attrMatch[2] ?? '';
    const values: string[] = [];
    let valMatch;
    while ((valMatch = valueRegex.exec(attrBlock)) !== null) {
      values.push((valMatch[1] ?? '').trim());
    }
    attrs[attrName] = values;
  }
  return attrs;
}

function parseSamlResponse(samlResponse: string): { email: string | null; userId: string | null; attributes: Record<string, string[]> } {
  let xml: string;
  try {
    xml = Buffer.from(samlResponse, 'base64').toString('utf-8');
  } catch {
    xml = samlResponse;
  }
  const attributes = parseAttributes(xml);
  const nameId = parseNameId(xml);
  return { email: nameId, userId: nameId, attributes };
}

export function registerSamlRoutes(app: FastifyInstance, redis: Redis, config: Config): void {
  const store = new SamlConfigStore(redis);

  app.post<{ Body: unknown }>('/v1/saml/config', async (req, reply) => {
    let body;
    try {
      body = SaveConfigBody.parse(req.body);
    } catch (err) {
      return reply.status(400).send({ error: `Invalid SAML config: ${String(err)}` });
    }
    await store.save({
      workspaceId: body.workspaceId,
      entryPoint: body.entryPoint,
      issuer: body.issuer,
      idpCert: body.idpCert,
      workspacePat: body.workspacePat,
      attributeMapping: body.attributeMapping,
    });
    return reply.send({ saved: true });
  });

  app.get<{ Params: { workspaceId: string } }>('/v1/saml/:workspaceId/login', async (req, reply) => {
    const { workspaceId } = req.params;
    const samlConfig = await store.get(workspaceId);
    if (!samlConfig) {
      return reply.status(404).send({ error: 'SAML is not configured for this workspace.' });
    }
    const callbackUrl = `${config.SAML_CALLBACK_BASE_URL}/api/auth/saml/${workspaceId}/callback`;
    const redirectUrl = buildAuthnRequest(config.SAML_SP_ENTITY_ID, callbackUrl, samlConfig.entryPoint);
    return reply.redirect(redirectUrl);
  });

  app.post<{ Params: { workspaceId: string }; Body: { SAMLResponse?: string } }>(
    '/v1/saml/:workspaceId/callback',
    async (req, reply) => {
      const { workspaceId } = req.params;
      const samlConfig = await store.get(workspaceId);
      if (!samlConfig) {
        return reply.status(400).send({ error: 'SAML not configured for this workspace.' });
      }

      const samlResponse = req.body?.SAMLResponse;
      if (!samlResponse) {
        return reply.status(400).send({ error: 'Missing SAMLResponse in callback body.' });
      }

      const { email: rawEmail, attributes } = parseSamlResponse(samlResponse);
      const email =
        extractAttribute(attributes, samlConfig.attributeMapping.email) ??
        rawEmail ??
        null;

      if (!email) {
        return reply.status(401).send({ error: 'Could not extract email from SAML assertion.' });
      }

      // Load stacks using workspace PAT
      const stackbyApiUrl = process.env['STACKBY_API_URL'] ?? 'https://api.stackby.com/API/v2';
      let stacks: Array<{ id: string; name: string }> = [];
      try {
        const { statusCode, body: respBody } = await undiciRequest(`${stackbyApiUrl}/meta/bases`, {
          headers: { 'x-api-key': samlConfig.workspacePat, Accept: 'application/json' },
        });
        if (statusCode === 200) {
          const data = (await respBody.json()) as unknown;
          const bases = Array.isArray(data)
            ? (data as Array<{ id: string; name: string }>)
            : (((data as Record<string, unknown>)?.['bases'] as Array<{ id: string; name: string }>) ?? []);
          stacks = bases.map((b) => ({ id: b.id, name: b.name }));
        }
      } catch {
        // non-fatal — stacks defaults to []
      }

      const sessionToken = randomUUID();
      await store.storeSession(sessionToken, {
        pat: samlConfig.workspacePat,
        stacks,
        email,
        workspaceId,
      });

      const completeUrl = `${config.SAML_CALLBACK_BASE_URL}/connect/saml-complete?saml_token=${sessionToken}`;
      return reply.redirect(completeUrl);
    },
  );

  // Session exchange — called by the saml-complete page
  app.get<{ Querystring: { saml_token: string } }>('/v1/saml/session', async (req, reply) => {
    const { saml_token } = req.query;
    if (!saml_token) return reply.status(400).send({ error: 'Missing saml_token' });
    const session = await store.consumeSession(saml_token);
    if (!session) return reply.status(404).send({ error: 'Session not found or expired.' });
    return reply.send({ connected: true, pat: session.pat, stacks: session.stacks, email: session.email });
  });
}
