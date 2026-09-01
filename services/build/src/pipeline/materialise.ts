import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import type { FileOperation } from '@stackby/schema-types';

export async function materialise(
  files: FileOperation[],
  baseDir: string,
): Promise<{ workDir: string; cleanup: () => Promise<void> }> {
  const workDir = join(baseDir, randomUUID());
  await mkdir(workDir, { recursive: true });

  for (const op of files) {
    if (op.op === 'write') {
      const filePath = join(workDir, op.path);
      const lastSlash = filePath.lastIndexOf('/');
      if (lastSlash > 0) {
        await mkdir(filePath.slice(0, lastSlash), { recursive: true });
      }
      await writeFile(filePath, op.content, 'utf-8');
    } else if (op.op === 'delete') {
      await rm(join(workDir, op.path), { force: true });
    }
    // 'rename': caller is expected to emit write+delete pairs
  }

  return {
    workDir,
    cleanup: () => rm(workDir, { recursive: true, force: true }),
  };
}

/** Compute truncated SHA-256 hashes for all written files */
export async function hashFiles(files: FileOperation[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const op of files) {
    if (op.op === 'write') {
      hashes[op.path] = createHash('sha256').update(op.content).digest('hex').slice(0, 16);
    }
  }
  return hashes;
}
