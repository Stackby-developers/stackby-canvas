import { createHash } from 'node:crypto';

export function computeContentAddress(
  artifactId: string,
  versionId: string,
  buildHash: string,
): string {
  return createHash('sha256')
    .update(`${artifactId}:${versionId}:${buildHash}`)
    .digest('hex');
}

export function storageKeyFromAddress(contentAddress: string): string {
  const prefix = contentAddress.slice(0, 2);
  return `artifacts/${prefix}/${contentAddress}`;
}
