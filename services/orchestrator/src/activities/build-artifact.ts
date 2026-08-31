import type { Redis } from 'ioredis';
import { request } from 'undici';
import type { Plan } from '@stackby/schema-types';
import type { ActivityContext, BuildResult } from '../workflows/shared/workflow-types.js';
import { emitEvent, runStreamKey } from './shared/emit-event.js';

interface Deps { redis: Redis; buildServiceUrl: string }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('buildArtifact deps not set'); return _deps; }

export async function buildArtifact(
  input: ActivityContext & { plan: Plan; appliedFiles: string[] },
): Promise<BuildResult> {
  const { redis, buildServiceUrl } = getDeps();

  await emitEvent(redis, runStreamKey(input.runId), {
    type: 'build_progress', runId: input.runId, ts: Date.now(), data: { progress: 0 },
  });

  const { statusCode, body } = await request(`${buildServiceUrl}/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: input.runId, files: input.appliedFiles }),
  });

  if (statusCode !== 200 && statusCode !== 201) {
    const text = await body.text();
    throw new Error(`Build service failed (${statusCode}): ${text}`);
  }

  const result = await body.json() as BuildResult;

  await emitEvent(redis, runStreamKey(input.runId), {
    type: 'build_progress', runId: input.runId, ts: Date.now(), data: { progress: 100 },
  });

  return result;
}
