import type { Redis } from 'ioredis';
import type { LLMRouter } from './shared/llm-router.js';
import type { ClarificationResult, IntentAnalysis, ActivityContext, ConversationTurn } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('clarify deps not set'); return _deps; }

export async function clarify(
  input: ActivityContext & { intent: IntentAnalysis; schemaProfile: unknown; conversationHistory?: ConversationTurn[] },
): Promise<ClarificationResult> {
  const { llm, redis } = getDeps();
  const systemPrompt = buildPrompt(AGENTS.clarifier, { schema: JSON.stringify(input.schemaProfile) });
  const prompt = `Intent: ${input.intent.intent}. History: ${JSON.stringify(input.conversationHistory ?? [])}`;
  const result = await llm({ tier: 'T1', systemPrompt, prompt, maxTokens: 512 });

  let questions: string[] = [];
  try {
    const parsed = JSON.parse(result.content) as { questions?: string[] };
    questions = parsed.questions ?? [];
  } catch { /* no questions */ }

  if (questions.length > 0) {
    await emitEvent(redis, runStreamKey(input.runId), {
      type: 'clarification', runId: input.runId, ts: Date.now(), data: { questions: questions.slice(0, 3) },
    });
  }

  return { questions: questions.slice(0, 3), answers: {}, skipped: questions.length === 0 };
}
