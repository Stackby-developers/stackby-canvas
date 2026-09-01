'use client';

const STUDIO_TOKENS: Record<string, string> = {
  '--color-bg': 'hsl(0 0% 100%)',
  '--color-bg-elevated': 'hsl(240 5% 96%)',
  '--color-bg-muted': 'hsl(240 4.8% 93.9%)',
  '--color-border': 'hsl(240 5.9% 90%)',
  '--color-border-muted': 'hsl(240 4.8% 93.9%)',
  '--color-text': 'hsl(240 10% 3.9%)',
  '--color-text-muted': 'hsl(240 3.8% 46.1%)',
  '--color-text-faint': 'hsl(240 3.8% 60%)',
  '--color-accent': 'hsl(239 84% 67%)',
  '--color-accent-hover': 'hsl(238 75% 58%)',
  '--color-success': 'hsl(142 71% 45%)',
  '--color-warning': 'hsl(38 92% 50%)',
  '--color-destructive': 'hsl(0 84% 60%)',
};

const GROUPS: Array<{ label: string; prefix: string }> = [
  { label: 'Colors', prefix: '--color-' },
];

export function TokenBrowser() {
  return (
    <div className="flex flex-col gap-4 overflow-auto p-3">
      {GROUPS.map((group) => {
        const entries = Object.entries(STUDIO_TOKENS).filter(([k]) => k.startsWith(group.prefix));
        return (
          <div key={group.label}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              {group.label}
            </p>
            <div className="flex flex-col gap-1">
              {entries.map(([name, value]) => (
                <div key={name} className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 shrink-0 rounded-sm border border-border"
                    style={{ background: value }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate font-mono text-[10px] text-text-muted">{name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-text-faint">{value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
