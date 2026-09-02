import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Client as TemporalClient } from '@temporalio/client';
import type { Config } from '../config.js';
import { GenerationWorkflow } from '../workflows/generation.js';

const RunBodySchema = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid(),
  stackId: z.string().min(1),
  prompt: z.string().min(1).max(4000),
  artifactType: z.enum([
    'dashboard', 'portal', 'report', 'form', 'gallery',
    'website', 'document', 'presentation',
  ]),
  designSystemId: z.string().uuid().optional(),
  modelTier: z.enum(['T0', 'T1', 'T2', 'T3']).optional(),
});

export function registerRunRoute(
  app: FastifyInstance,
  temporal: TemporalClient,
  config: Config,
): void {
  app.post<{ Body: unknown }>('/runs', async (request, reply) => {
    const body = RunBodySchema.parse(request.body);

    await temporal.workflow.start(GenerationWorkflow, {
      taskQueue: config.TEMPORAL_TASK_QUEUE,
      workflowId: body.runId,
      args: [
        {
          projectId: body.projectId,
          runId: body.runId,
          stackId: body.stackId,
          prompt: body.prompt,
          artifactType: body.artifactType,
          ...(body.designSystemId !== undefined ? { designSystemId: body.designSystemId } : {}),
        },
      ],
    });

    return reply.status(201).send({ runId: body.runId });
  });
}
