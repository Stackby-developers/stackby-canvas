import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { loadConfig } from './config.js';
import { registerCreateRoute } from './routes/create.js';
import { registerExtractRoute } from './routes/extract.js';
import { registerUpdateRoute } from './routes/update.js';
import { registerAssetsRoutes } from './routes/assets.js';
import { registerShareRoutes } from './routes/share.js';
import { registerSharedWithMeRoute } from './routes/shared-with-me.js';
import { registerVersionsRoute } from './routes/versions.js';
import { registerDependentsRoute } from './routes/dependents.js';
import { registerEventsRoute } from './routes/events-route.js';
import { registerCancelRoute } from './routes/cancel.js';
import { registerListRoute } from './routes/list.js';

const config = loadConfig();
const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
const pool = new Pool({ connectionString: config.DATABASE_URL });

await app.register(multipart);

app.get('/health', () => ({ status: 'ok', service: 'design-service' }));
app.get('/ready', async () => { await redis.ping(); return { status: 'ready', service: 'design-service' }; });

registerCreateRoute(app, pool);
registerExtractRoute(app, redis);
registerUpdateRoute(app, pool);
registerAssetsRoutes(app);
registerShareRoutes(app, pool);
registerSharedWithMeRoute(app, pool);
registerVersionsRoute(app, pool);
registerDependentsRoute(app, pool);
registerEventsRoute(app, redis);
registerCancelRoute(app);
registerListRoute(app, pool);

const start = async () => {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await redis.quit(); await pool.end(); });
process.on('SIGINT', async () => { await app.close(); await redis.quit(); await pool.end(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
