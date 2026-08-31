import { Context } from '@temporalio/activity';
import type { Redis } from 'ioredis';
import { request } from 'undici';
import type { ActivityContext } from '../workflows/shared/workflow-types.js';
import { emitEvent, runStreamKey } from './shared/emit-event.js';
import { withIdempotency } from './shared/idempotency.js';

interface Deps { redis: Redis; schemaServiceUrl: string }
let _deps: Deps | undefined;
export function setDeps(d: Deps) { _deps = d; }
function getDeps(): Deps { if (!_deps) throw new Error('analyzeSchema deps not set'); return _deps; }

export async function analyzeSchema(input: ActivityContext): Promise<{ stackId: string; tables: unknown[]; profiledAt: string }> {
  const { redis, schemaServiceUrl } = getDeps();
  const info = Context.current().info;
  const idemKey = `${info.workflowExecution?.workflowId ?? 'unknown'}:analyzeSchema`;

  return withIdempotency(redis, idemKey, async () => {
    const { statusCode, body } = await request(
      `${schemaServiceUrl}/schema/${encodeURIComponent(input.stackId)}/profile`,
    );
    if (statusCode !== 200) {
      const txt = await body.text();
      throw new Error(`Schema service returned ${statusCode}: ${txt}`);
    }
    const data = await body.json() as { profile: { stackId: string; tables: unknown[]; profiledAt: string } };

    await emitEvent(redis, runStreamKey(input.runId), {
      type: 'schema_analyzed',
      runId: input.runId,
      ts: Date.now(),
      data: { tableCount: data.profile.tables.length, columnCount: 0 },
    });

    return data.profile;
  });
}
