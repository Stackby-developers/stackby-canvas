export default function BuilderShellPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-sm font-medium text-text">Builder Shell</p>
      <p className="text-xs text-text-muted">Project {params.id}</p>
      <p className="text-xs text-text-faint">Coming in Phase 4</p>
    </div>
  );
}
