export interface SecretMatch {
  file: string;
  line: number;
  patternName: string;
  snippet: string;
}

export interface ScanResult {
  clean: boolean;
  matches: SecretMatch[];
}

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/ },
  { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'GitHub Fine-Grained Token', pattern: /github_pat_[a-zA-Z0-9_]{82}/ },
  { name: 'GitHub App Installation Token', pattern: /ghs_[a-zA-Z0-9]{36}/ },
  { name: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Access Key', pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*=\s*[a-zA-Z0-9+/]{40}/ },
  { name: 'Stripe Live Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/ },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{40,}/ },
  { name: 'Anthropic API Key', pattern: /sk-ant-api\d+-[a-zA-Z0-9_-]{93}/ },
  { name: 'Stackby PAT (non-placeholder)', pattern: /(?:STACKBY_PAT|STACKBY_API_KEY)\s*=\s*(?!your-|<|"|'|\s*$)[^\s]{10,}/ },
  { name: 'Generic Bearer Token in code', pattern: /["']Bearer\s+[a-zA-Z0-9._-]{30,}["']/ },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
];

function isExempted(filePath: string): boolean {
  const basename = filePath.split('/').pop() ?? '';
  if (basename === '.env.example' || basename === 'README.md') return true;
  if (basename.endsWith('.test.ts') || basename.endsWith('.spec.ts')) return true;
  return false;
}

export function scanFiles(files: Array<{ path: string; content: string }>): ScanResult {
  const matches: SecretMatch[] = [];
  for (const file of files) {
    if (isExempted(file.path)) continue;
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          const snippet = line.slice(0, 20).replace(/[^\s]/g, '*') + '...[REDACTED]';
          matches.push({ file: file.path, line: i + 1, patternName: name, snippet });
          break;
        }
      }
    }
  }
  return { clean: matches.length === 0, matches };
}

export class SecretScanError extends Error {
  constructor(public readonly matches: SecretMatch[]) {
    const summary = matches.map((m) => `  ${m.file}:${m.line} — ${m.patternName}`).join('\n');
    super(`Push blocked: ${matches.length} secret(s) detected:\n${summary}`);
    this.name = 'SecretScanError';
  }
}
