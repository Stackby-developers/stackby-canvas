import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { SandboxPool } from './sandbox/pool.js';
import { registerBuildRoute } from './routes/build.js';
import { registerScreenshotRoute } from './routes/screenshot-route.js';
import { registerElementMapRoute } from './routes/element-map-route.js';
import { registerBuildLogRoute } from './routes/build-log.js';
import { captureScreenshots } from './screenshot/playwright.js';
import { buildElementMap } from './screenshot/element-map.js';
import type { AllowlistConfig } from './pipeline/allowlist.js';

const config = loadConfig();

const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
const pool = new SandboxPool(config);

const allowlistPath = join(dirname(fileURLToPath(import.meta.url)), '../config/allowlist.json');
const allowlistConfig: AllowlistConfig = JSON.parse(readFileSync(allowlistPath, 'utf-8'));

app.get('/health', () => ({ status: 'ok', service: 'build-service' }));
app.get('/ready', async () => {
  await redis.ping();
  return { status: 'ready', service: 'build-service' };
});

const pipelineDeps = {
  config,
  allowlistConfig,
  captureScreenshots: (url: string, buildId: string) =>
    captureScreenshots(url, buildId, config.SCREENSHOT_TIMEOUT_MS),
  buildElementMap: (url: string) => buildElementMap(url, config.SCREENSHOT_TIMEOUT_MS),
  serveBundle: async (_outputDir: string, buildId: string) =>
    `http://localhost:${config.PORT}/preview/${buildId}`,
};

registerBuildRoute(app, pipelineDeps);
registerScreenshotRoute(app, config.SCREENSHOT_TIMEOUT_MS);
registerElementMapRoute(app, config.SCREENSHOT_TIMEOUT_MS);
registerBuildLogRoute(app, redis);

const start = async () => {
  await redis.connect();
  await pool.warm();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
};

process.on('SIGTERM', async () => { await app.close(); await pool.drain(); await redis.quit(); });
process.on('SIGINT', async () => { await app.close(); await pool.drain(); await redis.quit(); });

if (config.NODE_ENV !== 'test') void start();

export { app, config };
export default app;
