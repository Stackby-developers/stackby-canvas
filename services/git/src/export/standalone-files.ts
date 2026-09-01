import type { DataBinding } from '@stackby/schema-types';
import type { FileToPush } from '../providers/types.js';

export interface StandaloneInput {
  artifactName: string;
  artifactType: string;
  description: string;
  stackId: string;
  sdkVersion: string;
  sourceFiles: Array<{ path: string; content: string }>;
  bindings: DataBinding[];
  readmeContent: string;
}

const GITIGNORE_CONTENT = `node_modules/
dist/
.env.local
.env.*.local
*.tsbuildinfo
.DS_Store
`;

const ENV_EXAMPLE_CONTENT = `# Stackby Configuration — copy to .env.local and fill in values
STACKBY_STACK_ID=
STACKBY_API_KEY=

# Optional: local proxy port (default 3100)
VITE_PROXY_URL=http://localhost:3100
`;

function generatePackageJson(name: string, sdkVersion: string): string {
  return JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'concurrently "tsx stackby-proxy.ts" "vite"',
      build: 'tsc -p tsconfig.json --noEmit && vite build',
      typecheck: 'tsc -p tsconfig.json --noEmit',
      lint: 'eslint src --ext .ts,.tsx',
      preview: 'vite preview',
    },
    dependencies: {
      '@stackby/studio-sdk': sdkVersion,
      '@tanstack/react-query': '^5.36.0',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
    },
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
      concurrently: '^8.2.0',
      tsx: '^4.9.0',
      typescript: '^5.4.0',
      vite: '^5.3.0',
      tailwindcss: '^3.4.0',
      autoprefixer: '^10.4.0',
      postcss: '^8.4.0',
    },
  }, null, 2);
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/dg': {
        target: process.env['VITE_PROXY_URL'] ?? 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
});
`;
}

function generateStackbyProxy(stackId: string): string {
  return `/**
 * stackby-proxy.ts — local development proxy for Stackby API.
 * Run with: tsx stackby-proxy.ts
 * This proxy adds the PAT from .env.local to every request and never exposes it to the browser.
 */
import { createServer } from 'node:http';
import { request } from 'undici';

const PORT = parseInt(process.env['VITE_PROXY_URL']?.split(':').pop() ?? '3100', 10);
const PAT = process.env['STACKBY_API_KEY'];
const STACK_ID = process.env['STACKBY_STACK_ID'] ?? ${JSON.stringify(stackId)};
const STACKBY_API = 'https://api.stackby.com/API/v2';

if (!PAT) {
  console.error('STACKBY_API_KEY is not set. Copy .env.example to .env.local and add your PAT.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
    return res.end();
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/dg/v1/read')) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { tableId?: string };
    const tableId = body.tableId ?? '';
    const apiUrl = \`\${STACKBY_API}/\${STACK_ID}/\${tableId}?maxRecords=100\`;
    const { statusCode, body: apiBody } = await request(apiUrl, {
      method: 'GET',
      headers: { 'x-api-key': PAT!, 'Content-Type': 'application/json' },
    });
    const apiData = await apiBody.json() as { records?: unknown[] };
    const rows = apiData.records ?? [];
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ data: rows, meta: { rowIds: rows.map((_, i) => String(i)), columnIds: [], cacheAgeMs: 0, truncated: false, upstreamCalls: 1 } }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => console.log(\`Stackby proxy running on http://localhost:\${PORT}\`));
`;
}

function generateStackbyConfig(stackId: string, bindings: DataBinding[]): string {
  return JSON.stringify({
    $schema: 'https://studio.stackby.com/schemas/stackby.config.json',
    stackId,
    tables: [...new Set(bindings.map((b) => b.tableId))],
    generatedAt: new Date().toISOString(),
  }, null, 2);
}

function generateCiWorkflow(): string {
  return `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm build
`;
}

export function generateStandaloneFiles(input: StandaloneInput): FileToPush[] {
  return [
    { path: 'README.md', content: input.readmeContent },
    { path: '.gitignore', content: GITIGNORE_CONTENT },
    { path: '.env.example', content: ENV_EXAMPLE_CONTENT },
    { path: 'package.json', content: generatePackageJson(input.artifactName, input.sdkVersion) },
    { path: 'vite.config.ts', content: generateViteConfig() },
    { path: 'stackby-proxy.ts', content: generateStackbyProxy(input.stackId) },
    { path: 'stackby.config.json', content: generateStackbyConfig(input.stackId, input.bindings) },
    { path: '.github/workflows/ci.yml', content: generateCiWorkflow() },
    { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true }, include: ['src', 'stackby-proxy.ts'] }, null, 2) },
    ...input.sourceFiles,
  ];
}
