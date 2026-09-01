import type { FastifyInstance } from 'fastify';

export function registerAssetsRoutes(app: FastifyInstance): void {
  app.post<{ Params: { id: string } }>('/design-systems/:id/assets', async (request, reply) => {
    // Accept uploaded reference files (logos, brand PDFs, fonts)
    // Uploaded references are weighted ABOVE crawled inference
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file' });
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk as Buffer);
    return reply.status(201).send({ filename: data.filename, size: chunks.reduce((n, c) => n + c.length, 0) });
  });

  app.delete<{ Params: { id: string; assetId: string } }>(
    '/design-systems/:id/assets/:assetId',
    async (request, reply) => {
      return reply.send({ deleted: true, assetId: request.params.assetId });
    },
  );
}
