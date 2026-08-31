import { Context } from '@temporalio/activity';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { LLMRouter } from './shared/llm-router.js';
import type { Plan } from '@stackby/schema-types';
import type { IntentAnalysis, ClarificationResult, ActivityContext } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';
import { withIdempotency } from './shared/idempotency.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('plan deps not set'); return _deps; }

function extractJson(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m?.[1]) return m[1].trim();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1) return text.slice(s, e + 1);
  return text;
}

export async function generatePlan(
  input: ActivityContext & { intent: IntentAnalysis; schemaProfile: unknown; clarification: ClarificationResult; rejectionFeedback?: string },
): Promise<Plan> {
  const { llm, redis } = getDeps();
  const info = Context.current().info;
  const idemKey = `${info.workflowExecution?.workflowId ?? 'unknown'}:generatePlan:${info.attempt}`;

  return withIdempotency(redis, idemKey, async () => {
    const systemPrompt = buildPrompt(AGENTS.planner, {
      schema: JSON.stringify(input.schemaProfile),
      rejectionFeedback: input.rejectionFeedback,
    });
    const userPrompt = `Intent: ${input.intent.intent}\nArtifact type: ${input.intent.artifactType}\nClarifications: ${JSON.stringify(input.clarification.answers)}`;
    const result = await llm({ tier: 'T2', systemPrompt, prompt: userPrompt, maxTokens: 4096 });

    let plan: Plan;
    try {
      plan = JSON.parse(extractJson(result.content)) as Plan;
    } catch {
      plan = {
        id: randomUUID(),
        runId: input.runId,
        intent: input.intent.intent,
        artifactType: input.intent.artifactType,
        stackId: input.stackId,
        steps: [],
        createdAt: new Date().toISOString(),
      };
    }

    await emitEvent(redis, runStreamKey(input.runId), {
      type: 'plan', runId: input.runId, ts: Date.now(), data: plan,
    });

    return plan;
  });
}

export async function generateStack(
  input: ActivityContext & { description: string; tableCount: number; rowCount: number },
): Promise<unknown> {
  const { llm } = getDeps();
  const systemPrompt = buildPrompt(AGENTS.codeGenerator, {});
  const userPrompt = `Generate a Stackby stack: ${input.description}. Tables: ${input.tableCount}, rows per primary table: ${input.rowCount}`;
  const result = await llm({ tier: 'T2', systemPrompt, prompt: userPrompt, maxTokens: 4096 });
  try {
    return JSON.parse(extractJson(result.content));
  } catch {
    return { description: input.description, tables: [] };
  }
}
