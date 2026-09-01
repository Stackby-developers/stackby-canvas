import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { setupActivityDeps, createWorker } from './worker.js';
import { createTemporalClient } from './client.js';
import { registerSseRoute } from './routes/sse.js';
import { registerSignalRoute } from './routes/signal.js';
import { registerRunRoute } from './routes/run.js';
import { registerVisualEditRoute } from './routes/visual-edit.js';
import { registerAnnotationsRoute } from './routes/annotations.js';

const config = loadConfig();

const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });

app.get('/health', () => ({ status: 'ok', service: 'orchestrator-service' }));
app.get('/ready', async () => { await redis.ping(); return { status: 'ready', service: 'orchestrator-service' }; });

registerSseRoute(app, redis);

export const TEMPORAL_TASK_QUEUE = config.TEMPORAL_TASK_QUEUE;

const start = async () => {
  await redis.connect();
  setupActivityDeps(config);

  const temporalClient = await createTemporalClient(config);
  registerSignalRoute(app, temporalClient);
  registerRunRoute(app, temporalClient, config);
  registerVisualEditRoute(app, temporalClient, config);
  registerAnnotationsRoute(app, temporalClient, config);

  const worker = await createWorker(config);
  void worker.run();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

if (config.NODE_ENV !== 'test') void start();

export { app, redis };
export default app;
