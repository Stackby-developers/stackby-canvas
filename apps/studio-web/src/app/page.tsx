import { PromptComposer } from '@/src/components/home/prompt-composer';
import { HomeProjectFeed } from '@/src/components/home/home-project-feed';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';
import type { Project } from '@/src/lib/types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning. What's first?";
  if (h < 17) return "What's the idea today?";
  return "Fresh start. What are we making?";
}

export default async function HomePage() {
  let recentProjects: Project[] = [];
  try {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/v1/projects?workspaceId=${DEV_WORKSPACE_ID}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { projects: Project[] };
      recentProjects = data.projects.slice(0, 6);
    }
  } catch {
    // backend offline
  }

  const seen = new Set<string>();
  const recentStacks = recentProjects
    .filter((p) => { if (seen.has(p.stackId)) return false; seen.add(p.stackId); return true; })
    .slice(0, 5)
    .map((p) => ({ id: p.stackId, name: p.name }));

  return (
    <div className="flex h-full flex-col">
      {/* Centered composer area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6">
        {/* Wordmark row */}
        <div className="mb-6 flex items-center gap-2">
          <span className="text-[16px] font-semibold text-text">Studio</span>
          <span
            className="rounded-full px-2 py-0.5 text-[12px] font-medium"
            style={{
              background: 'hsl(var(--color-badge-bg))',
              color: 'hsl(var(--color-badge-text))',
            }}
          >
            Experiment
          </span>
        </div>

        {/* Greeting */}
        <h1 className="mb-8 text-center text-[44px] font-semibold leading-[1.1] text-text">
          {getGreeting()}
        </h1>

        {/* Composer */}
        <div className="w-full max-w-[832px]">
          <PromptComposer recentStacks={recentStacks} />
        </div>
      </div>

      {/* Project feed */}
      <div className="px-6 pb-6">
        <HomeProjectFeed projects={recentProjects} />
      </div>
    </div>
  );
}
