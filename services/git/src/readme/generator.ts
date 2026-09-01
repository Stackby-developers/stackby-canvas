import type { DataBinding } from '@stackby/schema-types';

export interface ReadmeInput {
  artifactName: string;
  artifactType: string;
  description: string;
  stackId: string;
  stackName: string;
  bindings: DataBinding[];
  sdkVersion: string;
  repoName: string;
}

export function generateReadme(input: ReadmeInput): string {
  const bindingTable = buildBindingTable(input.bindings);
  return `# ${input.artifactName}

${input.description}

---

## What this is

A **${input.artifactType}** built with [Stackby Studio](https://studio.stackby.com), connected to the **${input.stackName}** stack. Generated from a natural-language prompt and exported as a standalone React/TypeScript application.

## Architecture

\`\`\`
Browser (React 18 + TypeScript + Tailwind CSS)
    ↓ @stackby/studio-sdk@${input.sdkVersion}
Local proxy (stackby-proxy.ts)
    ↓ Stackby Personal Access Token
Stackby API
\`\`\`

All data access goes through the SDK hooks (\`useRecords\`, \`useMutation\`, etc.). The local proxy handles authentication — your PAT never reaches the browser.

## Data bindings

${bindingTable}

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`STACKBY_STACK_ID\` | ✓ | Your Stackby stack ID (e.g. \`stk_abc123\`) |
| \`STACKBY_API_KEY\` | ✓ | Your Stackby Personal Access Token |
| \`VITE_PROXY_URL\` | | Local proxy URL (default: \`http://localhost:3100\`) |

Copy \`.env.example\` to \`.env.local\` and fill in the values:

\`\`\`bash
cp .env.example .env.local
\`\`\`

## Local development

\`\`\`bash
# Install dependencies
pnpm install

# Start the local proxy and dev server
pnpm dev
\`\`\`

The proxy runs on \`http://localhost:3100\` and the app on \`http://localhost:5173\`.

## Deployment

### Vercel
\`\`\`bash
vercel --prod
\`\`\`
Set \`STACKBY_STACK_ID\` and \`STACKBY_API_KEY\` as environment variables in the Vercel dashboard.

### Netlify / Cloudflare Pages
Deploy the \`dist/\` folder produced by \`pnpm build\`. The proxy must be deployed as a serverless function or a separate service.

## Dependencies

- [@stackby/studio-sdk](https://www.npmjs.com/package/@stackby/studio-sdk) — \`${input.sdkVersion}\`
- [React](https://react.dev/) — \`^18.0.0\`
- [Tailwind CSS](https://tailwindcss.com/) — \`^3.0.0\`
- [@tanstack/react-query](https://tanstack.com/query) — \`^5.0.0\`
`;
}

function buildBindingTable(bindings: DataBinding[]): string {
  if (!bindings.length) return '_No data bindings declared._\n';
  const header = '| Component | Table | Columns | Filter |';
  const sep = '|-----------|-------|---------|--------|';
  const rows = bindings.map((b) => {
    const cols = b.columnIds.length > 0 ? b.columnIds.join(', ') : '(all)';
    const filter = b.filter ? JSON.stringify(b.filter) : '—';
    return `| \`${b.componentId}\` | ${b.tableName} | ${cols} | \`${filter}\` |`;
  });
  return [header, sep, ...rows].join('\n');
}
