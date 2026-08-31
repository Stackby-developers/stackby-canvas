import Fastify from 'fastify';

const SERVICE = 'gateway-service';
const PORT = parseInt(process.env['PORT'] ?? '3002', 10);

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
