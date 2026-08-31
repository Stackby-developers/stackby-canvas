import { Redis } from 'ioredis';

export class SchemaCache {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  private schemaKey(stackId: string): string {
    return `schema:graph:${stackId}`;
  }

  private etagKey(stackId: string): string {
    return `schema:etag:${stackId}`;
  }

  async getSchema(stackId: string): Promise<{ data: string; etag: string } | null> {
    const [data, etag] = await this.redis.mget(this.schemaKey(stackId), this.etagKey(stackId));
    if (!data || !etag) return null;
    return { data, etag };
  }

  async setSchema(stackId: string, data: string, etag: string, ttlSeconds: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.schemaKey(stackId), data, 'EX', ttlSeconds);
    pipeline.set(this.etagKey(stackId), etag, 'EX', ttlSeconds);
    await pipeline.exec();
  }

  async invalidate(stackId: string): Promise<void> {
    await this.redis.del(this.schemaKey(stackId), this.etagKey(stackId));
  }

  get client(): Redis {
    return this.redis;
  }
}
