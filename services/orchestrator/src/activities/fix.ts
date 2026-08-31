import type { Redis } from 'ioredis';
import type { LLMRouter } from './shared/llm-router.js';
import type { Plan, FileOperation } from '@stackby/schema-types';
import type { ActivityContext } from '../workflows/shared/workflow-types.js';
import { buildPrompt, AGENTS } from '@stackby/prompts';
import { emitEvent, runStreamKey } from './shared/emit-event.js';

interface Deps { llm: LLMRouter; redis: Redis }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('fixCode deps not set'); return _deps; }

function parseFileOperations(content: string): FileOperation[] {
  const ops: FileOperation[] = [];
  const re = /```(?:\w+)?\s+(?:path=)?([\w/.@-]+)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1] && m[2]) ops.push({ op: 'write', path: m[1], content: m[2] });
  }
  return ops.length > 0 ? ops : [{ op: 'write', path: 'src/App.tsx', content }];
}

export async function fixCode(
  input: ActivityContext & { plan: Plan; buildErrors?: string[]; visualIssues?: string[]; fileOps: FileOperation[]; cycle: number },
): Promise<FileOperation[]> {
  const { llm, redis } = getDeps();
  const issues = [...(input.buildErrors ?? []), ...(input.visualIssues ?? [])];
  const issueType = (input.buildErrors?.length ?? 0) > 0 ? 'TypeScript' : 'visual layout';

  await emitEvent(redis, runStreamKey(input.runId), {
    type: 'fix', runId: input.runId, ts: Date.now(),
    data: { issue: issues[0] ?? 'Unknown issue', attempt: input.cycle + 1 },
  });

  const systemPrompt = buildPrompt(AGENTS.fixer, { plan: JSON.stringify(input.plan) });
  const writtenPaths = input.fileOps
    .filter((o): o is FileOperation & { op: 'write' } => o.op === 'write')
    .map((o) => o.path)
    .join(', ');

  const prompt = `Fix these ${issueType} issues (cycle ${input.cycle + 1}/3):
${issues.map((i, n) => `${n + 1}. ${i}`).join('\n')}

Current files: ${writtenPaths}

Fix root causes, not symptoms. Emit only changed files.`;

  const result = await llm({ tier: 'T2', systemPrompt, prompt, maxTokens: 8192 });
  return parseFileOperations(result.content);
}
