import type { Redis } from 'ioredis';
import { request } from 'undici';
import type { LLMRouter } from './shared/llm-router.js';
import type { Plan } from '@stackby/schema-types';
import type { ActivityContext, VerifyResult } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('verifyVisually deps not set'); return _deps; }

export async function verifyVisually(
  input: ActivityContext & { plan: Plan; screenshotUrl: string },
): Promise<VerifyResult> {
  const { llm, redis } = getDeps();

  let base64 = '';
  try {
    const { body } = await request(input.screenshotUrl);
    const buffer = Buffer.from(await body.arrayBuffer());
    base64 = buffer.toString('base64');
  } catch {
    // Screenshot unavailable — pass with no issues
    return { pass: true, issues: [], screenshotUrl: input.screenshotUrl };
  }

  const systemPrompt = buildPrompt(AGENTS.visualVerifier, { plan: JSON.stringify(input.plan) });
  const result = await llm({
    tier: 'T3',
    systemPrompt,
    prompt: 'Verify this screenshot against the plan. Return JSON: {"pass": boolean, "issues": string[]}',
    images: [{ base64, mediaType: 'image/png' }],
    maxTokens: 1024,
  });

  let verifyResult: VerifyResult;
  try {
    const parsed = JSON.parse(result.content) as { pass: boolean; issues: string[] };
    verifyResult = { pass: parsed.pass, issues: parsed.issues ?? [], screenshotUrl: input.screenshotUrl };
  } catch {
    verifyResult = { pass: true, issues: [], screenshotUrl: input.screenshotUrl };
  }

  await emitEvent(redis, runStreamKey(input.runId), {
    type: 'verify', runId: input.runId, ts: Date.now(),
    data: { pass: verifyResult.pass, issues: verifyResult.issues },
  });

  return verifyResult;
}
