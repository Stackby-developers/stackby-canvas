import { spawnSync } from 'node:child_process';
import type { BuildError } from './types.js';

// TS error format: path(line,col): error TS1234: message
const TS_ERROR_RE = /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

export function runTypecheck(workDir: string, timeoutMs: number): BuildError[] {
  const result = spawnSync('npx', ['tsc', '--noEmit', '--strict', '--skipLibCheck'], {
    cwd: workDir,
    timeout: timeoutMs,
    encoding: 'utf-8',
    shell: false,
  });

  if (result.status === 0) return [];

  const output = (result.stdout ?? '') + (result.stderr ?? '');
  return parseTypeScriptErrors(output, workDir);
}

export function parseTypeScriptErrors(output: string, workDir: string): BuildError[] {
  const errors: BuildError[] = [];
  for (const line of output.split('\n')) {
    const m = TS_ERROR_RE.exec(line.trim());
    if (!m) continue;
    const [, rawFile, rawLine, rawCol, severity, code, message] = m;
    const err: BuildError = {
      phase: 'typecheck',
      file: rawFile!.replace(workDir + '/', ''),
      line: parseInt(rawLine!, 10),
      column: parseInt(rawCol!, 10),
      message: message!,
      severity: severity === 'error' ? 'error' : 'warning',
    };
    if (code !== undefined) err.code = code;
    errors.push(err);
  }
  return errors;
}
