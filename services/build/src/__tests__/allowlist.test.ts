import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { checkAllowlist, type AllowlistConfig } from '../pipeline/allowlist.js';

const TEST_CONFIG: AllowlistConfig = {
  version: '1',
  packages: ['react', 'react-dom', '@stackby/studio-sdk', 'zod'],
  scopeWildcards: ['@radix-ui/'],
};

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `allowlist-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('checkAllowlist', () => {
  it('passes for allowed imports', async () => {
    await writeFile(join(testDir, 'App.tsx'), [
      "import React from 'react';",
      "import { useRecords } from '@stackby/studio-sdk';",
      "import { z } from 'zod';",
      "import './local.css';",
      "export default function App() { return <div />; }",
    ].join('\n'));
    expect(checkAllowlist(testDir, TEST_CONFIG)).toHaveLength(0);
  });

  it('rejects a non-allowlisted package with a clear message', async () => {
    await writeFile(join(testDir, 'App.tsx'), [
      "import axios from 'axios';",
      "export default function App() { return <div />; }",
    ].join('\n'));
    const errors = checkAllowlist(testDir, TEST_CONFIG);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain('axios');
    expect(errors[0]!.message).toContain('allowlist');
    expect(errors[0]!.code).toBe('PACKAGE_NOT_ALLOWLISTED');
    expect(errors[0]!.phase).toBe('allowlist');
    expect(errors[0]!.severity).toBe('error');
  });

  it('allows scoped wildcard packages (@radix-ui/*)', async () => {
    await writeFile(join(testDir, 'Button.tsx'), [
      "import * as Dialog from '@radix-ui/react-dialog';",
      "import * as Select from '@radix-ui/react-select';",
      "export default function Button() { return <div />; }",
    ].join('\n'));
    expect(checkAllowlist(testDir, TEST_CONFIG)).toHaveLength(0);
  });

  it('allows node built-in imports (node:*)', async () => {
    await writeFile(join(testDir, 'util.ts'), [
      "import { readFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
    ].join('\n'));
    expect(checkAllowlist(testDir, TEST_CONFIG)).toHaveLength(0);
  });

  it('allows relative imports', async () => {
    await writeFile(join(testDir, 'App.tsx'), [
      "import React from 'react';",
      "import { Foo } from './foo';",
      "import Bar from '../bar/baz';",
    ].join('\n'));
    expect(checkAllowlist(testDir, TEST_CONFIG)).toHaveLength(0);
  });

  it('reports the correct line number of the violation', async () => {
    await writeFile(join(testDir, 'App.tsx'), [
      "import React from 'react';",
      "import _ from 'lodash';",
    ].join('\n'));
    const errors = checkAllowlist(testDir, TEST_CONFIG);
    expect(errors[0]!.line).toBe(2);
  });

  it('catches require() syntax', async () => {
    await writeFile(join(testDir, 'server.js'), "const express = require('express');");
    const errors = checkAllowlist(testDir, TEST_CONFIG);
    expect(errors[0]!.message).toContain('express');
  });

  it('skips node_modules directories', async () => {
    await mkdir(join(testDir, 'node_modules', 'evil'), { recursive: true });
    await writeFile(join(testDir, 'node_modules', 'evil', 'index.ts'), "import evil from 'evil';");
    expect(checkAllowlist(testDir, TEST_CONFIG)).toHaveLength(0);
  });
});
