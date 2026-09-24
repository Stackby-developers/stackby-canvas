import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import pg from 'pg';
import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { registerBalanceRoute } from './routes/credits/balance.js';
import { registerHistoryRoute } from './routes/credits/history.js';
import { registerPreviewRoute } from './routes/credits/preview.js';
import { registerDebitRoute } from './routes/credits/debit.js';
import { registerAdminArtifactsRoute } from './routes/admin/artifacts.js';
import { registerForceUnpublishRoute } from './routes/admin/force-unpublish.js';
import { registerAuditRoute } from './routes/admin/audit-route.js';
import { registerPolicyRoute } from './routes/admin/policy.js';
import { registerUsageRoute } from './routes/admin/usage.js';
import { registerCreateProjectRoute } from './routes/projects/create.js';
import { registerListProjectsRoute } from './routes/projects/list.js';
import { registerAuthConnectRoute } from './routes/auth/connect.js';
import { registerWebhookCreateRoute } from './routes/webhooks/create.js';
import { registerWebhookListRoute } from './routes/webhooks/list.js';
import { registerWebhookDeleteRoute } from './routes/webhooks/delete.js';
import { registerWebhookDeliveriesRoute } from './routes/webhooks/deliveries.js';
import { registerCheckoutRoute } from './routes/billing/checkout.js';
import { registerWebhookRoute } from './routes/billing/webhook.js';
import { registerSamlRoutes } from './routes/auth/saml.js';

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });

await app.register(cors, { origin: true });
await app.register(formbody);

app.get('/health', () => ({ status: 'ok', service: 'api' }));
app.get('/ready', async () => {
  if (config.NODE_ENV !== 'test') await pool.query('SELECT 1');
  return { status: 'ready', service: 'api' };
});

registerBalanceRoute(app, pool);
registerHistoryRoute(app, pool);
registerPreviewRoute(app, config);
registerDebitRoute(app, pool, config);
registerAdminArtifactsRoute(app, pool);
registerForceUnpublishRoute(app, pool, config);
registerAuditRoute(app, pool);
registerPolicyRoute(app, pool, config);
registerUsageRoute(app, pool);
registerCreateProjectRoute(app, pool, config);
registerListProjectsRoute(app, pool);
registerAuthConnectRoute(app);
registerWebhookCreateRoute(app, pool);
registerWebhookListRoute(app, pool);
registerWebhookDeleteRoute(app, pool);
registerWebhookDeliveriesRoute(app, pool);
registerCheckoutRoute(app, config);
registerWebhookRoute(app, pool, config);
registerSamlRoutes(app, redis, config);

const start = async () => {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await pool.end(); await redis.quit(); });
process.on('SIGINT', async () => { await app.close(); await pool.end(); await redis.quit(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
