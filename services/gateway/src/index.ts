import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { StackbyClient } from './stackby-client.js';
import { JwtVerifier } from './auth/jwt.js';
import { BindingRegistry } from './bindings/registry.js';
import { RowCache } from './cache/store.js';
import { PerStackTokenBucket } from './rate-limit/token-bucket.js';
import { CooldownManager } from './rate-limit/backoff.js';
import { registerReadRoute } from './routes/read.js';
import { registerMutateRoute } from './routes/mutate.js';
import { registerAggregateRoute } from './routes/aggregate-route.js';
import { registerMeRoute } from './routes/me.js';
import { registerUploadRoute } from './routes/upload.js';

const config = loadConfig();

const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
const client = new StackbyClient(config);
const verifier = new JwtVerifier(config.JWT_SECRET);
const registry = new BindingRegistry(redis);
const cache = new RowCache(redis, config.CACHE_TTL_SECONDS, config.STALE_TTL_SECONDS);
const bucket = new PerStackTokenBucket(redis, config.RATE_LIMIT_RPS, config.RATE_LIMIT_BURST);
const cooldown = new CooldownManager(redis, config.COOLDOWN_MS);

const app = Fastify({
  logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' },
});

await app.register(multipart);

app.get('/health', () => ({ status: 'ok', service: 'gateway-service' }));
app.get('/ready', async () => {
  await redis.ping();
  return { status: 'ready', service: 'gateway-service' };
});

const routeDeps = { verifier, registry, cache, bucket, cooldown, client, config, redis };

registerReadRoute(app, routeDeps);
registerMutateRoute(app, routeDeps);
registerAggregateRoute(app, routeDeps);
registerMeRoute(app, verifier);
registerUploadRoute(app, config);

const start = async () => {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => {
  await app.close();
  await redis.quit();
});
process.on('SIGINT', async () => {
  await app.close();
  await redis.quit();
});

if (config.NODE_ENV !== 'test') void start();

export { app, redis, client, verifier, registry, cache, bucket, cooldown, config };
export default app;
