import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Client as TemporalClient } from '@temporalio/client';
import type { Config } from '../config.js';
import { AnnotationWorkflow } from '../workflows/annotation.js';

const AnnotationBodySchema = z.object({
  projectId: z.string(),
  stackId: z.string(),
  artifactId: z.string(),
  annotations: z
    .array(
      z.object({
        componentId: z.string(),
        comment: z.string().min(1),
        severity: z.enum(['critical', 'minor']),
      }),
    )
    .min(1),
});

export function registerAnnotationsRoute(
  app: FastifyInstance,
  temporal: TemporalClient,
  config: Config,
): void {
  app.post<{ Params: { runId: string }; Body: unknown }>(
    '/runs/:runId/annotations',
    async (request, reply) => {
      const { runId } = request.params;
      const body = AnnotationBodySchema.parse(request.body);
      const workflowId = `annotations-${runId}-${Date.now()}`;
      await temporal.workflow.start(AnnotationWorkflow, {
        taskQueue: config.TEMPORAL_TASK_QUEUE,
        workflowId,
        args: [{ runId, ...body }],
      });
      return reply.send({ ok: true, workflowId });
    },
  );
}
