import Fastify from 'fastify';
import { Redis } from 'ioredis';
import pg from 'pg';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

app.get('/health', () => ({ status: 'ok', service: 'git-service' }));
app.get('/ready', async () => { await redis.ping(); return { status: 'ready', service: 'git-service' }; });

const start = async () => {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await redis.quit(); await pool.end(); });
process.on('SIGINT', async () => { await app.close(); await redis.quit(); await pool.end(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
