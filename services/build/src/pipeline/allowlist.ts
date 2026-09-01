import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { BuildError } from './types.js';

export interface AllowlistConfig {
  version: string;
  packages: string[];
  scopeWildcards: string[];
}

const IMPORT_RE = /^\s*import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/gm;
const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function isRelative(pkg: string): boolean {
  return pkg.startsWith('.') || pkg.startsWith('/');
}

function resolvePackageName(pkg: string): string {
  if (pkg.startsWith('@')) {
    const parts = pkg.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : pkg;
  }
  return pkg.split('/')[0] ?? pkg;
}

function isAllowed(pkg: string, config: AllowlistConfig): boolean {
  if (isRelative(pkg)) return true;
  if (pkg.startsWith('node:')) return true;

  const name = resolvePackageName(pkg);
  if (config.packages.includes(name)) return true;

  for (const wildcard of config.scopeWildcards) {
    if (pkg.startsWith(wildcard)) return true;
  }

  return false;
}

function* walkFiles(dir: string, exts = new Set(['.ts', '.tsx', '.js', '.jsx'])): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkFiles(full, exts);
    } else if (exts.has(extname(full))) {
      yield full;
    }
  }
}

export function checkAllowlist(workDir: string, config: AllowlistConfig): BuildError[] {
  const errors: BuildError[] = [];

  for (const filePath of walkFiles(workDir)) {
    const content = readFileSync(filePath, 'utf-8');
    const relative = filePath.slice(workDir.length + 1);

    for (const re of [IMPORT_RE, REQUIRE_RE]) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(content)) !== null) {
        const pkg = match[1]!;
        if (!isAllowed(pkg, config)) {
          const line = content.slice(0, match.index).split('\n').length;
          errors.push({
            phase: 'allowlist',
            file: relative,
            line,
            column: 1,
            code: 'PACKAGE_NOT_ALLOWLISTED',
            message: `Package "${pkg}" is not in the dependency allowlist. Add it to config/allowlist.json to use it.`,
            severity: 'error',
          });
        }
      }
    }
  }

  return errors;
}
