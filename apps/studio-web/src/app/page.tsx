import { PromptComposer } from '@/src/components/home/prompt-composer';
import { HomeProjectFeed } from '@/src/components/home/home-project-feed';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';
import type { Project } from '@/src/lib/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning. What's first?";
  if (hour < 17) return "Good afternoon. What's the idea?";
  return "Good evening. What do you want to build?";
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
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-text">
          {getGreeting()}
        </h1>
        <div className="w-full max-w-2xl">
          <PromptComposer recentStacks={recentStacks} />
        </div>
      </div>
      <div className="px-6 pb-8">
        <HomeProjectFeed projects={recentProjects} />
      </div>
    </div>
  );
}
