import type { Redis } from 'ioredis';
import type { LLMRouter } from './shared/llm-router.js';
import type { Plan, FileOperation } from '@stackby/schema-types';
import type { ActivityContext, ConversationTurn } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('generateCode deps not set'); return _deps; }

function parseFileOperations(content: string): FileOperation[] {
  const ops: FileOperation[] = [];
  const re = /```(?:\w+)?\s+(?:path=)?([\w/.@-]+)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1] && m[2]) ops.push({ op: 'write', path: m[1], content: m[2] });
  }
  if (ops.length === 0) ops.push({ op: 'write', path: 'src/App.tsx', content });
  return ops;
}

export async function generateCode(
  input: ActivityContext & { plan: Plan; schemaProfile: unknown; designContext: unknown; conversationHistory?: ConversationTurn[] },
): Promise<FileOperation[]> {
  const { llm, redis } = getDeps();
  const systemPrompt = buildPrompt(AGENTS.codeGenerator, {
    plan: JSON.stringify(input.plan),
    schema: JSON.stringify(input.schemaProfile),
  });
  const result = await llm({ tier: 'T2', systemPrompt, prompt: 'Generate the complete artifact source.', maxTokens: 8192 });
  const ops = parseFileOperations(result.content);

  for (const op of ops) {
    if (op.op === 'write') {
      await emitEvent(redis, runStreamKey(input.runId), {
        type: 'codegen', runId: input.runId, ts: Date.now(),
        data: { step: op.path, fileOp: op },
      });
    }
  }
  return ops;
}

export async function generateVisualPatch(
  input: ActivityContext & { patch: unknown; artifactId: string },
): Promise<FileOperation[]> {
  const { llm } = getDeps();
  const result = await llm({ tier: 'T2', systemPrompt: buildPrompt(AGENTS.fixer, {}), prompt: `Apply visual patch: ${JSON.stringify(input.patch)}`, maxTokens: 2048 });
  return parseFileOperations(result.content);
}

export async function generateAnnotationPatches(
  input: ActivityContext & { annotations: unknown[]; artifactId: string },
): Promise<FileOperation[]> {
  const { llm } = getDeps();
  const result = await llm({ tier: 'T2', systemPrompt: buildPrompt(AGENTS.fixer, {}), prompt: `Apply annotations: ${JSON.stringify(input.annotations)}`, maxTokens: 4096 });
  return parseFileOperations(result.content);
}
