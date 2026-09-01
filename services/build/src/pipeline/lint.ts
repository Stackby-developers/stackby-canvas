import { spawnSync } from 'node:child_process';
import type { BuildError } from './types.js';

interface EslintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line?: number;
  column?: number;
}

interface EslintFile {
  filePath: string;
  messages: EslintMessage[];
}

export function runEslint(workDir: string, timeoutMs: number): BuildError[] {
  const result = spawnSync(
    'npx',
    ['eslint', '--format', 'json', '--ext', '.ts,.tsx', 'src'],
    { cwd: workDir, timeout: timeoutMs, encoding: 'utf-8', shell: false },
  );

  const json = result.stdout?.trim();
  if (!json) return [];

  try {
    const files = JSON.parse(json) as EslintFile[];
    const errors: BuildError[] = [];
    for (const file of files) {
      for (const msg of file.messages) {
        const err: BuildError = {
          phase: 'lint',
          file: file.filePath.replace(workDir + '/', ''),
          message: msg.message,
          severity: msg.severity === 1 ? 'warning' : 'error',
        };
        if (msg.line !== undefined) err.line = msg.line;
        if (msg.column !== undefined) err.column = msg.column;
        if (msg.ruleId !== null && msg.ruleId !== undefined) err.code = msg.ruleId;
        errors.push(err);
      }
    }
    return errors;
  } catch {
    return [];
  }
}
