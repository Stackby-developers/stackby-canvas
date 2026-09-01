import { randomBytes, createHash } from 'node:crypto';
import { request } from 'undici';
import type { Config } from '../config.js';

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

export function generatePKCE(): PKCEParams {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state = randomBytes(16).toString('hex');
  return { codeVerifier, codeChallenge, state };
}

export function buildAuthUrl(
  config: Pick<Config, 'STACKBY_OAUTH_URL' | 'STACKBY_CLIENT_ID'>,
  pkce: PKCEParams,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    client_id: config.STACKBY_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile collaborators:read',
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    state: pkce.state,
  });
  return `${config.STACKBY_OAUTH_URL}/authorize?${params}`;
}

export async function exchangeCode(
  config: Config,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ accessToken: string; userId: string; email: string; name?: string }> {
  const { statusCode, body } = await request(`${config.STACKBY_OAUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.STACKBY_CLIENT_ID,
      client_secret: config.STACKBY_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (statusCode !== 200) {
    const text = await body.text();
    throw new Error(`SSO token exchange failed (${statusCode}): ${text}`);
  }

  const data = await body.json() as {
    access_token: string;
    user_id: string;
    email: string;
    name?: string;
  };

  return {
    accessToken: data.access_token,
    userId: data.user_id,
    email: data.email,
    name: data.name,
  };
}
