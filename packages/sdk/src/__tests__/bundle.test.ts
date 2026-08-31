import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '../..');
const DIST_DIR = join(ROOT, 'dist');
const BUNDLE_PATH = join(DIST_DIR, 'index.js');

describe('built bundle', () => {
  beforeAll(() => {
    if (!existsSync(BUNDLE_PATH)) {
      execSync('pnpm build', { cwd: ROOT, stdio: 'inherit' });
    }
  }, 60_000);

  it('exists after build', () => {
    expect(existsSync(BUNDLE_PATH)).toBe(true);
  });

  it('does not contain stackby.com (no direct API calls)', () => {
    const bundle = readFileSync(BUNDLE_PATH, 'utf-8');
    expect(bundle).not.toContain('stackby.com');
    expect(bundle).not.toContain('api.stackby.com');
  });

  it('is under 28KB gzipped (excluding peer deps)', () => {
    const bundle = readFileSync(BUNDLE_PATH);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;
    // Log actual size for visibility
    console.info(`Bundle gzipped size: ${sizeKB.toFixed(2)} KB`);
    expect(sizeKB).toBeLessThan(28);
  });
});
