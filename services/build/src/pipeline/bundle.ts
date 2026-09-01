import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BuildError } from './types.js';

export interface BundleResult {
  errors: BuildError[];
  outputDir: string;
  success: boolean;
}

export function runViteBuild(workDir: string, timeoutMs: number): BundleResult {
  const outputDir = join(workDir, 'dist');

  const result = spawnSync('npx', ['vite', 'build', '--outDir', outputDir], {
    cwd: workDir,
    timeout: timeoutMs,
    encoding: 'utf-8',
    shell: false,
  });

  const success = result.status === 0 && existsSync(outputDir);
  const errors: BuildError[] = [];

  if (!success) {
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    for (const line of output.split('\n')) {
      if (/error|Error/.test(line)) {
        errors.push({
          phase: 'bundle',
          file: extractFileFromLine(line, workDir),
          message: line.trim(),
          severity: 'error',
        });
      }
    }
    if (!errors.length) {
      errors.push({ phase: 'bundle', file: '', message: 'Vite build failed', severity: 'error' });
    }
  }

  return { errors, outputDir, success };
}

function extractFileFromLine(line: string, workDir: string): string {
  const m = line.match(/(?:file|at)\s+([^\s:]+\.(?:ts|tsx|js|jsx))/);
  if (m?.[1]) return m[1].replace(workDir + '/', '');
  return '';
}
