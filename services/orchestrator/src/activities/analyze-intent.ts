import { Context } from '@temporalio/activity';
import type { Redis } from 'ioredis';
import type { LLMRouter } from './shared/llm-router.js';
import type { IntentAnalysis, ActivityContext } from '../workflows/shared/workflow-types.js';
import type { ArtifactType } from '@stackby/schema-types';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';
import { withIdempotency } from './shared/idempotency.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('analyzeIntent deps not set'); return _deps; }

function extractJson(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m?.[1]) return m[1].trim();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1) return text.slice(s, e + 1);
  return text;
}

export async function analyzeIntent(
  input: ActivityContext & { prompt: string; artifactType: ArtifactType },
): Promise<IntentAnalysis> {
  const { llm, redis } = getDeps();
  const info = Context.current().info;
  const idemKey = `${info.workflowExecution?.workflowId ?? 'unknown'}:analyzeIntent:${info.attempt}`;

  return withIdempotency(redis, idemKey, async () => {
    await emitEvent(redis, runStreamKey(input.runId), {
      type: 'intent', runId: input.runId, ts: Date.now(), data: { intent: input.prompt },
    });

    const systemPrompt = buildPrompt(AGENTS.intentAnalyzer, {});
    const result = await llm({ tier: 'T1', systemPrompt, prompt: input.prompt, maxTokens: 1024 });

    try {
      return JSON.parse(extractJson(result.content)) as IntentAnalysis;
    } catch {
      return { intent: input.prompt, artifactType: input.artifactType, confidence: 0.8 };
    }
  });
}
