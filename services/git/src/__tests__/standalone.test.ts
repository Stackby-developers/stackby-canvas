import { describe, it, expect } from 'vitest';
import { generateStandaloneFiles } from '../export/standalone-files.js';
import { scanFiles } from '../secrets/scanner.js';

const MOCK_INPUT = {
  artifactName: 'Task Dashboard',
  artifactType: 'dashboard',
  description: 'Task tracker',
  stackId: 'stk_abc123',
  sdkVersion: '0.1.0',
  sourceFiles: [{ path: 'src/App.tsx', content: 'export default function App() { return <div>Hello</div>; }' }],
  bindings: [{ componentId: 'TaskList', tableId: 'tbl_1', tableName: 'Tasks', columnIds: ['Name', 'Status'] }],
  readmeContent: '# Task Dashboard\nContent here.',
};

describe('standalone project generation', () => {
  const files = generateStandaloneFiles(MOCK_INPUT);
  const byPath = Object.fromEntries(files.map((f) => [f.path, f.content]));

  it('includes all required files', () => {
    expect(byPath['README.md']).toBeDefined();
    expect(byPath['.gitignore']).toBeDefined();
    expect(byPath['.env.example']).toBeDefined();
    expect(byPath['package.json']).toBeDefined();
    expect(byPath['vite.config.ts']).toBeDefined();
    expect(byPath['stackby-proxy.ts']).toBeDefined();
    expect(byPath['stackby.config.json']).toBeDefined();
    expect(byPath['.github/workflows/ci.yml']).toBeDefined();
    expect(byPath['src/App.tsx']).toBeDefined();
    expect(byPath['tsconfig.json']).toBeDefined();
  });

  it('.env.example has empty placeholders (no real credentials)', () => {
    const env = byPath['.env.example']!;
    expect(env).toContain('STACKBY_API_KEY=');
    expect(env).not.toMatch(/STACKBY_API_KEY=[^\s]{5,}/);
  });

  it('.gitignore excludes .env.local', () => {
    expect(byPath['.gitignore']).toContain('.env.local');
    expect(byPath['.gitignore']).toContain('node_modules/');
  });

  it('package.json pins studio-sdk at correct version', () => {
    const pkg = JSON.parse(byPath['package.json']!) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['@stackby/studio-sdk']).toBe('0.1.0');
  });

  it('package.json name is kebab-cased', () => {
    const pkg = JSON.parse(byPath['package.json']!) as { name: string };
    expect(pkg.name).toBe('task-dashboard');
  });

  it('stackby.config.json contains stackId not PAT', () => {
    const cfg = JSON.parse(byPath['stackby.config.json']!) as { stackId: string };
    expect(cfg.stackId).toBe('stk_abc123');
    expect(byPath['stackby.config.json']).not.toContain('API_KEY');
    expect(byPath['stackby.config.json']).not.toContain('PAT');
  });

  it('CI workflow has install, typecheck, lint, build steps', () => {
    const ci = byPath['.github/workflows/ci.yml']!;
    expect(ci).toContain('pnpm install');
    expect(ci).toContain('pnpm typecheck');
    expect(ci).toContain('pnpm lint');
    expect(ci).toContain('pnpm build');
  });

  it('stackby-proxy.ts reads PAT from env — never hardcodes', () => {
    const proxy = byPath['stackby-proxy.ts']!;
    expect(proxy).toContain('process.env');
    expect(proxy).toContain('STACKBY_API_KEY');
    expect(proxy).not.toMatch(/['"](sk|ghp_)['"]/);
  });

  it('all generated files pass the secret scanner', () => {
    const result = scanFiles(files.map((f) => ({ path: f.path, content: f.content })));
    expect(result.clean).toBe(true);
  });

  it('.env.example passes the secret scanner', () => {
    const result = scanFiles([{ path: '.env.example', content: byPath['.env.example']! }]);
    expect(result.clean).toBe(true);
  });
});
