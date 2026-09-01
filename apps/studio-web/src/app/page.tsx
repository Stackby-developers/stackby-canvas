import { PromptComposer } from '@/src/components/home/prompt-composer';
import { TemplateStrip } from '@/src/components/home/template-strip';

export default async function HomePage() {
  let recentStacks: Array<{ id: string; name: string }> = [];
  try {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/v1/projects?workspaceId=dev-workspace`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { projects: Array<{ stackId: string; name: string }> };
      const seen = new Set<string>();
      recentStacks = data.projects
        .filter((p) => {
          if (seen.has(p.stackId)) return false;
          seen.add(p.stackId);
          return true;
        })
        .slice(0, 5)
        .map((p) => ({ id: p.stackId, name: p.name }));
    }
  } catch {
    // backend not running — show empty state
  }

  return (
    <div className="flex h-full flex-col items-center justify-start overflow-auto px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            What do you want to build?
          </h1>
          <p className="text-sm text-text-muted">
            Describe it in plain English — Studio generates a real React app connected to your Stackby data.
          </p>
        </div>

        <PromptComposer recentStacks={recentStacks} />

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">
            Quick start
          </h2>
          <TemplateStrip />
        </div>
      </div>
    </div>
  );
}
