import type { SandboxAdapter, SandboxOptions, SandboxResult } from './types.js';

/**
 * Firecracker micro-VM sandbox for production use.
 *
 * PRODUCTION WIRING REQUIRED:
 * 1. Install Firecracker binary: https://github.com/firecracker-microvm/firecracker
 * 2. Create a base rootfs ext4 image with Node 20, pnpm, and allowlisted node_modules pre-baked:
 *      docker build -t studio-build-base .
 *      docker run --rm studio-build-base tar -c /app | ext4-create studio-build-base.ext4
 * 3. Configure jailer: UID/GID mapping, cgroup v2 CPU/memory limits, seccomp filters
 * 4. Set up tap networking with an egress iptables/nftables rule:
 *      - Allow: internal npm registry mirror IP
 *      - Block: everything else (DROP by default)
 * 5. Use VSOCK to communicate with a guest agent running inside the VM
 * 6. On each build: restore VM from snapshot (cold-start < 200ms from snapshot)
 * 7. Destroy VM after each build; never reuse across different tenants
 *
 * Until wired up, SANDBOX_TYPE=process is used for all non-production environments.
 */
export class FirecrackerSandbox implements SandboxAdapter {
  readonly type = 'firecracker';
  reusable = true;

  async execute(_command: string[], _opts: SandboxOptions): Promise<SandboxResult> {
    throw new Error(
      'FirecrackerSandbox requires production setup. ' +
      'Set SANDBOX_TYPE=process for development. ' +
      'See src/sandbox/firecracker.ts for wiring instructions.',
    );
  }

  async destroy(): Promise<void> { /* restore VM snapshot in production */ }
}
