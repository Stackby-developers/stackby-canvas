import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { readProgress } from '../events/stream.js';

export function registerEventsRoute(app: FastifyInstance, redis: Redis): void {
  app.get<{ Params: { id: string }; Querystring: { from?: string } }>(
    '/design-systems/:id/events',
    async (request, reply) => {
      const { id } = request.params;
      let lastId = request.query.from ?? '0';

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const existing = await readProgress(redis, id, lastId);
      for (const ev of existing) {
        reply.raw.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev.progress)}\n\n`);
        lastId = ev.id;
        if (ev.progress.step === 'complete' || ev.progress.step === 'failed' || ev.progress.step === 'cancelled') {
          reply.raw.end();
          return;
        }
      }

      const poll = async () => {
        while (!request.socket.destroyed) {
          const evs = await readProgress(redis, id, lastId);
          for (const ev of evs) {
            reply.raw.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev.progress)}\n\n`);
            lastId = ev.id;
            if (ev.progress.step === 'complete' || ev.progress.step === 'failed' || ev.progress.step === 'cancelled') {
              reply.raw.end();
              return;
            }
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
      };

      void poll();
      request.socket.on('close', () => reply.raw.end());
    },
  );
}
