import Fastify from 'fastify';
import { Redis } from 'ioredis';
import pg from 'pg';
import { loadConfig } from './config.js';
import { registerInstallRoute } from './routes/install.js';
import { registerExportNewRoute } from './routes/export-new-route.js';
import { registerExportExistingRoute } from './routes/export-existing-route.js';
import { registerPushRoute } from './routes/push-route.js';
import { registerSyncRoute } from './routes/sync-route.js';
import { registerPolicyRoute } from './routes/policy-route.js';
import { registerLinksRoute } from './routes/links-route.js';

const config = loadConfig();
const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

app.get('/health', () => ({ status: 'ok', service: 'git-service' }));
app.get('/ready', async () => { await redis.ping(); return { status: 'ready', service: 'git-service' }; });

registerInstallRoute(app, pool, config);
registerExportNewRoute(app, pool, config);
registerExportExistingRoute(app, pool, config);
registerPushRoute(app, pool, config);
registerSyncRoute(app, pool, config);
registerPolicyRoute(app, pool);
registerLinksRoute(app, pool);

const start = async () => {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await redis.quit(); await pool.end(); });
process.on('SIGINT', async () => { await app.close(); await redis.quit(); await pool.end(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
