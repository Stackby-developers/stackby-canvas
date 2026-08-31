import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/', 'video/', 'audio/'];

export function registerUploadRoute(app: FastifyInstance, config: Config): void {
  app.post('/dg/v1/upload', async (request, reply) => {
    const data = await request.file({ limits: { fileSize: config.MAX_UPLOAD_BYTES } });
    if (!data) {
      return reply.status(400).send({ code: 'NO_FILE', userMessage: 'No file was uploaded.' });
    }

    const mime = data.mimetype;
    if (!ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
      // Drain stream to avoid memory leak before rejecting
      for await (const _ of data.file) { /* drain */ }
      return reply.status(415).send({
        code: 'UNSUPPORTED_MIME',
        userMessage: `File type "${mime}" is not allowed.`,
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk as Buffer);
    }
    const size = chunks.reduce((n, c) => n + c.length, 0);

    return reply.send({ filename: data.filename, mime, size, status: 'accepted' });
  });
}
