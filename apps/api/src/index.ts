import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
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

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });

await app.register(cors, { origin: true });

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

const start = async () => {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await pool.end(); });
process.on('SIGINT', async () => { await app.close(); await pool.end(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
