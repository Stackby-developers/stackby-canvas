import type { Redis } from 'ioredis';
import type { LLMRouter } from './shared/llm-router.js';
import type { Plan } from '@stackby/schema-types';
import type { ActivityContext, BuildResult } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('summarise deps not set'); return _deps; }

export async function summarise(input: ActivityContext & { plan: Plan; buildResult: BuildResult }): Promise<void> {
  const { llm, redis } = getDeps();
  const systemPrompt = buildPrompt(AGENTS.summariser, {});
  await llm({ tier: 'T0', systemPrompt, prompt: `Summarise this build: ${JSON.stringify(input.plan)}`, maxTokens: 256 });

  await emitEvent(redis, runStreamKey(input.runId), {
    type: 'ready', runId: input.runId, ts: Date.now(),
    data: { previewUrl: input.buildResult.previewUrl || 'https://preview.stackby.com' },
  });
}
