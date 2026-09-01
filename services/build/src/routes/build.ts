import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { FileOperationSchema } from '@stackby/schema-types';
import type { PipelineRunnerDeps } from '../pipeline/runner.js';
import { runPipeline } from '../pipeline/runner.js';
import type { BuildInput } from '../pipeline/types.js';

const BuildBodySchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  runId: z.string(),
  files: z.array(FileOperationSchema),
  previousHashes: z.record(z.string()).optional(),
});

export function registerBuildRoute(app: FastifyInstance, deps: PipelineRunnerDeps): void {
  app.post('/build', async (request, reply) => {
    const parsed = BuildBodySchema.parse(request.body);
    // Build explicit BuildInput — previousHashes omitted when undefined to satisfy exactOptionalPropertyTypes
    const input: BuildInput = parsed.previousHashes !== undefined
      ? { ...parsed, previousHashes: parsed.previousHashes }
      : { projectId: parsed.projectId, versionId: parsed.versionId, runId: parsed.runId, files: parsed.files };
    const result = await runPipeline(input, deps);
    return reply.send(result);
  });
}
