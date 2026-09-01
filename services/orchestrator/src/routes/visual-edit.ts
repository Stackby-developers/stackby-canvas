import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Client as TemporalClient } from '@temporalio/client';
import type { Config } from '../config.js';
import type { VisualEditInput } from '../workflows/visual-edit.js';
import { VisualEditWorkflow } from '../workflows/visual-edit.js';

const VisualEditBodySchema = z.object({
  projectId: z.string(),
  stackId: z.string(),
  artifactId: z.string(),
  patch: z.object({
    componentId: z.string(),
    property: z.string(),
    value: z.unknown(),
  }),
  affectsLayout: z.boolean().default(false),
});

export function registerVisualEditRoute(
  app: FastifyInstance,
  temporal: TemporalClient,
  config: Config,
): void {
  app.post<{ Params: { runId: string }; Body: unknown }>(
    '/runs/:runId/visual-edit',
    async (request, reply) => {
      const { runId } = request.params;
      const body = VisualEditBodySchema.parse(request.body);
      const workflowId = `visual-edit-${runId}-${Date.now()}`;
      const input: VisualEditInput = {
        runId,
        projectId: body.projectId,
        stackId: body.stackId,
        artifactId: body.artifactId,
        patch: {
          componentId: body.patch.componentId,
          property: body.patch.property,
          value: body.patch.value,
        },
        affectsLayout: body.affectsLayout,
      };
      await temporal.workflow.start(VisualEditWorkflow, {
        taskQueue: config.TEMPORAL_TASK_QUEUE,
        workflowId,
        args: [input],
      });
      return reply.send({ ok: true, workflowId });
    },
  );
}
