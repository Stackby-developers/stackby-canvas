import type { LLMRouter } from './shared/llm-router.js';
import type { Plan } from '@stackby/schema-types';
import type { ActivityContext } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';

interface Deps { llm: LLMRouter }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('design deps not set'); return _deps; }

export async function generateDesign(input: ActivityContext & { plan: Plan; designSystemId?: string }): Promise<unknown> {
  const { llm } = getDeps();
  const systemPrompt = buildPrompt(AGENTS.codeGenerator, { plan: JSON.stringify(input.plan) });
  const result = await llm({ tier: 'T2', systemPrompt, prompt: 'Generate design context and component tokens for this plan.', maxTokens: 2048 });
  return { designContext: result.content, designSystemId: input.designSystemId };
}

export async function extractDesignTokens(input: ActivityContext & { artifactUrl: string; workspaceId: string }): Promise<unknown> {
  return { tokens: {}, workspaceId: input.workspaceId, artifactUrl: input.artifactUrl, extractedAt: new Date().toISOString() };
}
