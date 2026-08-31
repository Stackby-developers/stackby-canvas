import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { GatewayClient } from './gateway-client.js';
import { SchemaCache } from './lib/cache.js';
import { registerSchemaRoute } from './routes/schema.js';
import { registerRefreshRoute } from './routes/refresh.js';
import { registerProfileRoute } from './routes/profile.js';
import { registerTypesRoute } from './routes/types-route.js';
import { registerDriftRoute } from './routes/drift-route.js';

const config = loadConfig();

const app = Fastify({
  logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' },
});

const cache = new SchemaCache(config.REDIS_URL);
const gateway = new GatewayClient(config.GATEWAY_URL);

app.get('/health', () => ({ status: 'ok', service: 'schema-service' }));
app.get('/ready', async () => {
  await cache.client.ping();
  return { status: 'ready', service: 'schema-service' };
});

registerSchemaRoute(app, cache, gateway, config);
registerRefreshRoute(app, cache, gateway, config);
registerProfileRoute(app, cache, gateway, config);
registerTypesRoute(app, cache, gateway);
registerDriftRoute(app, cache, gateway);

const start = async () => {
  await cache.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

const stop = async () => {
  await app.close();
  await cache.disconnect();
};

process.on('SIGTERM', () => { void stop(); });
process.on('SIGINT', () => { void stop(); });

if (config.NODE_ENV !== 'test') {
  void start();
}

export { app, cache, gateway, config };
export default app;
