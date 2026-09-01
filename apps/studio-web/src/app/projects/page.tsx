import { ProjectsList } from '@/src/components/projects/projects-list';
import type { Project } from '@/src/lib/types';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  let projects: Project[] = [];
  try {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/v1/projects?workspaceId=${DEV_WORKSPACE_ID}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { projects: Project[] };
      projects = data.projects;
    }
  } catch {
    // backend not running — show empty state
  }

  return (
    <div className="h-full overflow-auto px-6 py-8">
      <ProjectsList initialProjects={projects} />
    </div>
  );
}
