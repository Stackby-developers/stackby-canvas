import { BuilderShell } from '@/src/components/builder/builder-shell';

export default function BuilderShellPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { runId?: string };
}) {
  return (
    <BuilderShell
      projectId={params.id}
      runId={searchParams['runId'] ?? null}
    />
  );
}
