export interface SandboxOptions {
  workDir: string;
  timeoutMs: number;
  memoryLimitMb: number;
  cpuMillicores: number;
  /** Hosts the sandbox is allowed to reach. All others must be blocked. */
  allowedEgressHosts: string[];
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  killedByTimeout: boolean;
}

export interface SandboxAdapter {
  readonly type: string;
  execute(command: string[], opts: SandboxOptions): Promise<SandboxResult>;
  destroy(): Promise<void>;
  reusable: boolean;
}
