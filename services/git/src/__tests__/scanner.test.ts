import { describe, it, expect } from 'vitest';
import { scanFiles, SecretScanError } from '../secrets/scanner.js';

describe('secret scanner', () => {
  it('passes clean files', () => {
    const result = scanFiles([
      { path: 'src/App.tsx', content: 'export default function App() { return <div>Hello</div>; }' },
      { path: 'package.json', content: '{"name":"test","version":"1.0.0"}' },
    ]);
    expect(result.clean).toBe(true);
    expect(result.matches).toHaveLength(0);
  });

  it('blocks GitHub PAT', () => {
    const result = scanFiles([{ path: 'src/config.ts', content: 'const TOKEN = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij12";' }]);
    expect(result.clean).toBe(false);
    expect(result.matches[0]!.patternName).toContain('GitHub');
    expect(result.matches[0]!.file).toBe('src/config.ts');
    expect(result.matches[0]!.line).toBe(1);
  });

  it('blocks AWS access key', () => {
    const result = scanFiles([{ path: 'src/aws.ts', content: 'const key = "AKIAIOSFODNN7EXAMPLE";' }]);
    expect(result.clean).toBe(false);
    expect(result.matches[0]!.patternName).toContain('AWS');
  });

  it('blocks private key', () => {
    const result = scanFiles([{ path: 'src/cert.ts', content: '`-----BEGIN RSA PRIVATE KEY-----`' }]);
    expect(result.clean).toBe(false);
    expect(result.matches[0]!.patternName).toContain('Private Key');
  });

  it('blocks OpenAI key', () => {
    const result = scanFiles([{ path: 'src/ai.ts', content: 'const key = "sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstu";' }]);
    expect(result.clean).toBe(false);
  });

  it('blocks Stripe live key', () => {
    // Test string deliberately split to avoid triggering GitHub push protection
    const prefix = 'sk_li' + 've_';
    const content = `const k = "${prefix}${'a'.repeat(24)}";`;
    const result = scanFiles([{ path: 'src/pay.ts', content }]);
    expect(result.clean).toBe(false);
  });

  it('allows .env.example with empty placeholders', () => {
    const result = scanFiles([{ path: '.env.example', content: 'STACKBY_API_KEY=\nSTACKBY_STACK_ID=stk_your_stack_id' }]);
    expect(result.clean).toBe(true);
  });

  it('allows README.md', () => {
    const result = scanFiles([{ path: 'README.md', content: 'Use STACKBY_API_KEY=your-key-here to configure.' }]);
    expect(result.clean).toBe(true);
  });

  it('allows test files', () => {
    const result = scanFiles([{ path: 'src/auth.test.ts', content: 'const fakePat = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij12";' }]);
    expect(result.clean).toBe(true);
  });

  it('redacts snippet — does not log the actual secret', () => {
    const result = scanFiles([{ path: 'src/cfg.ts', content: 'const x = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij12";' }]);
    const snippet = result.matches[0]!.snippet;
    expect(snippet).toContain('[REDACTED]');
    expect(snippet).not.toContain('ghp_');
  });

  it('SecretScanError message names all violations with file and line', () => {
    const result = scanFiles([
      { path: 'a.ts', content: 'const t = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij12";' },
      { path: 'b.ts', content: 'const k = "AKIAIOSFODNN7EXAMPLE";' },
    ]);
    const err = new SecretScanError(result.matches);
    expect(err.message).toContain('a.ts');
    expect(err.message).toContain('b.ts');
    expect(err.matches).toHaveLength(2);
    expect(err.name).toBe('SecretScanError');
  });

  it('reports correct line number for violation on line 3', () => {
    const content = 'line1\nline2\nconst k = "AKIAIOSFODNN7EXAMPLE";\nline4';
    const result = scanFiles([{ path: 'src/f.ts', content }]);
    expect(result.matches[0]!.line).toBe(3);
  });
});
