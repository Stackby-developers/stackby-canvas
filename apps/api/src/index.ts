import Fastify from 'fastify';
import cors from '@fastify/cors';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
});

app.get('/health', () => ({ status: 'ok', service: 'api' }));
app.get('/ready', () => ({ status: 'ready', service: 'api' }));

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
