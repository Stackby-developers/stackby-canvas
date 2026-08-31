import Fastify from 'fastify';

const SERVICE = 'orchestrator-service';
const PORT = parseInt(process.env['PORT'] ?? '3003', 10);

// Temporal worker will be wired up in a follow-up; stub for now
export const TEMPORAL_TASK_QUEUE = 'studio-builds';

const app = Fastify({ logger: true });

app.get('/health', () => ({ status: 'ok', service: SERVICE }));
app.get('/ready', () => ({ status: 'ready', service: SERVICE }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();

export default app;
