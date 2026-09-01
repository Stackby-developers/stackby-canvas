import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import Redis from 'ioredis';
import pg from 'pg';
import { loadConfig } from './config.js';
import { registerPublishRoute } from './routes/publish-route.js';
import { registerRollbackRoute } from './routes/rollback-route.js';
import { registerUnpublishRoute } from './routes/unpublish-route.js';
import { registerServeRoute } from './routes/serve-route.js';
import { registerAuthCallbackRoute } from './routes/auth-callback.js';
import { registerDeepLinkRoute } from './routes/deep-link.js';
import { registerAdminRoute } from './routes/admin-route.js';

const config = loadConfig();
const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

await app.register(cookie);

app.get('/health', () => ({ status: 'ok', service: 'publish-service' }));
app.get('/ready', async () => { await redis.ping(); return { status: 'ready', service: 'publish-service' }; });

registerPublishRoute(app, pool, redis, config);
registerRollbackRoute(app, pool, redis);
registerUnpublishRoute(app, pool, redis);
registerServeRoute(app, pool, redis, config);
registerAuthCallbackRoute(app, redis, config);
registerDeepLinkRoute(app);
registerAdminRoute(app, pool, redis);

const start = async () => {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await redis.quit(); await pool.end(); });
process.on('SIGINT', async () => { await app.close(); await redis.quit(); await pool.end(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
