import { spawn } from 'node:child_process';
import type { SandboxAdapter, SandboxOptions, SandboxResult } from './types.js';

/** Child-process sandbox for development and testing. No VM isolation. */
export class ProcessSandbox implements SandboxAdapter {
  readonly type = 'process';
  reusable = false;

  async execute(command: string[], opts: SandboxOptions): Promise<SandboxResult> {
    const start = Date.now();
    return new Promise((resolve) => {
      const proc = spawn(command[0]!, command.slice(1), {
        cwd: opts.workDir,
        timeout: opts.timeoutMs,
        env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${opts.memoryLimitMb}` },
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
      proc.on('close', (code, signal) => {
        resolve({ exitCode: code ?? 1, stdout, stderr, durationMs: Date.now() - start, killedByTimeout: signal === 'SIGTERM' });
      });
    });
  }

  async destroy(): Promise<void> { /* no-op */ }
}
