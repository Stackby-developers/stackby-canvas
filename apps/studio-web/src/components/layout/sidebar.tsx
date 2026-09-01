'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Search, FolderOpen, Palette,
  ChevronDown, ChevronRight, Monitor, Sun, Moon,
  Keyboard, ThumbsUp, LogOut,
} from 'lucide-react';
import { cn } from '@stackby/ui';
import { SettingsModal } from './settings-modal';

const NAV = [
  { href: '/',               icon: Home,       label: 'Home' },
  { href: '/search',         icon: Search,     label: 'Search' },
  { href: '/projects',       icon: FolderOpen, label: 'Projects' },
  { href: '/design-systems', icon: Palette,    label: 'Design systems' },
] as const;

const RECENT = [
  { id: '1', name: 'Employee Directory Dashboard' },
  { id: '2', name: 'Regional Athletic Launch Hub' },
];

type AppearanceMode = 'system' | 'light' | 'dark';

export function Sidebar() {
  const pathname = usePathname();
  const [recentOpen, setRecentOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceMode>('system');
  const [settingsOpen, setSettingsOpen] = useState(false);

  function applyAppearance(mode: AppearanceMode) {
    setAppearance(mode);
    setAppearanceOpen(false);
    setUserMenuOpen(false);
    const root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    else if (mode === 'light') root.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }

  return (
    <>
      <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg overflow-hidden">
        {/* Logo */}
        <div className="flex h-12 items-center px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-text">
            <span className="text-xs font-bold text-bg">S</span>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="px-2 space-y-0.5">
          {NAV.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-bg-muted font-medium text-text'
                    : 'text-text-muted hover:bg-bg-muted hover:text-text',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Recent */}
        <div className="mt-4 px-2">
          <button
            onClick={() => setRecentOpen((o) => !o)}
            className="flex w-full items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-faint hover:text-text-muted transition-colors"
          >
            {recentOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Recent
          </button>
          {recentOpen && (
            <div className="mt-0.5 space-y-0.5">
              {RECENT.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-text-muted hover:bg-bg-muted hover:text-text transition-colors"
                >
                  <div className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border bg-bg-muted" />
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Bottom bar */}
        <div className="relative border-t border-border px-2 py-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setUserMenuOpen((o) => !o); setAppearanceOpen(false); }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-text text-bg text-xs font-bold hover:opacity-80 transition-opacity"
            >
              R
            </button>
            <button
              className="flex items-center justify-center rounded-md p-1.5 text-text-faint hover:text-text hover:bg-bg-muted transition-colors"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-text-muted hover:text-text hover:bg-bg-muted transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" /> Share feedback
            </button>
          </div>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-52 rounded-lg border border-border bg-bg shadow-lg py-1 z-50">
              <div className="relative">
                <button
                  onClick={() => setAppearanceOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-text hover:bg-bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-text-muted" /> Appearance
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
                </button>
                {appearanceOpen && (
                  <div className="absolute left-full top-0 ml-1 w-36 rounded-lg border border-border bg-bg shadow-lg py-1 z-50">
                    {(
                      [
                        ['system', Monitor, 'System'],
                        ['light', Sun, 'Light'],
                        ['dark', Moon, 'Dark'],
                      ] as const
                    ).map(([mode, Icon, label]) => (
                      <button
                        key={mode}
                        onClick={() => applyAppearance(mode)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm text-text hover:bg-bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-text-muted" /> {label}
                        </div>
                        {appearance === mode && <span className="text-accent">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSettingsOpen(true); setUserMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-muted transition-colors"
              >
                Settings
              </button>

              <div className="my-1 h-px bg-border" />

              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-muted transition-colors">
                <LogOut className="h-4 w-4 text-text-muted" /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
