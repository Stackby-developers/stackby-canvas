import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { readEvents } from '../events/stream.js';

export function registerSseRoute(app: FastifyInstance, redis: Redis): void {
  app.get<{ Params: { runId: string }; Querystring: { from?: string } }>(
    '/runs/:runId/events',
    async (request, reply) => {
      const { runId } = request.params;
      let lastId = request.query.from ?? '0';

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      // Replay all existing events first (resumable from sequence number)
      const existing = await readEvents(redis, runId, lastId);
      for (const ev of existing) {
        reply.raw.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`);
        lastId = ev.id;
      }

      const poll = async () => {
        while (!request.socket.destroyed) {
          const events = await readEvents(redis, runId, lastId, 5000);
          for (const ev of events) {
            reply.raw.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`);
            lastId = ev.id;
            if (ev.type === 'ready' || ev.type === 'error') {
              reply.raw.end();
              return;
            }
          }
        }
      };

      void poll();
      request.socket.on('close', () => { reply.raw.end(); });
    },
  );
}
