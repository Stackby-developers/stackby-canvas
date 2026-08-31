import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Client as TemporalClient } from '@temporalio/client';

const SignalBodySchema = z.object({
  signal: z.enum(['approvePlan', 'rejectPlan', 'clarifyResponse', 'cancel']),
  payload: z.record(z.unknown()).optional(),
});

export function registerSignalRoute(app: FastifyInstance, temporal: TemporalClient): void {
  app.post<{ Params: { runId: string }; Body: unknown }>(
    '/runs/:runId/signal',
    async (request, reply) => {
      const { runId } = request.params;
      const { signal, payload } = SignalBodySchema.parse(request.body);
      const handle = temporal.workflow.getHandle(runId);
      await handle.signal(signal, payload ?? {});
      return reply.send({ ok: true });
    },
  );
}
