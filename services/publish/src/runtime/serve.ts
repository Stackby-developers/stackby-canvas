import { request } from 'undici';
import type { FastifyReply } from 'fastify';

/**
 * Stream a built artifact file from object storage to the response.
 * Object storage is MinIO in dev; S3/R2 in production.
 */
export async function serveArtifactFile(
  storageUrl: string,
  bucket: string,
  storageKey: string,
  filePath: string,
  reply: FastifyReply,
): Promise<void> {
  const objectKey = `${storageKey}/${filePath}`;
  const url = `${storageUrl}/${bucket}/${encodeURIComponent(objectKey)}`;

  const { statusCode, body, headers } = await request(url);

  if (statusCode === 404) {
    return reply.status(404).send({ error: 'File not found' });
  }
  if (statusCode !== 200) {
    return reply.status(502).send({ error: 'Storage error' });
  }

  const contentType = (headers['content-type'] as string | undefined) ?? 'application/octet-stream';
  reply.header('Content-Type', contentType);
  // Content-addressed storage key = immutable; safe to cache forever
  reply.header('Cache-Control', 'public, max-age=31536000, immutable');

  return reply.send(body);
}
