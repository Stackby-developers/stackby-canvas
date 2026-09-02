'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Search, FolderOpen, Palette,
  ChevronDown, ChevronRight, Monitor, Sun, Moon,
  LogOut, ThumbsUp, Keyboard,
} from 'lucide-react';
import { SettingsModal } from './settings-modal';
import { Logo } from './logo';

const NAV = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/design-systems', icon: Palette, label: 'Design systems' },
] as const;

const RECENT = [
  { id: '1', name: 'Employee Directory Dashboard' },
  { id: '2', name: 'Regional Athletic Launch' },
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
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
  }

  return (
    <>
      {(userMenuOpen || appearanceOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setUserMenuOpen(false); setAppearanceOpen(false); }}
        />
      )}

      <aside className="relative z-40 hidden md:flex h-full w-14 lg:w-[272px] shrink-0 flex-col overflow-visible">
        {/* Logo */}
        <div className="flex h-10 items-center px-[12px] mt-1">
          <Logo size={26} />
        </div>

        {/* Primary nav */}
        <nav className="mt-1 px-2 space-y-0.5">
          {NAV.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex h-8 w-full items-center gap-[10px] rounded-[6px] px-2 text-[16px] transition-colors duration-150',
                  isActive ? 'bg-surface text-text' : 'text-text-secondary hover:bg-hover',
                ].join(' ')}
              >
                <item.icon strokeWidth={1.6} className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden lg:inline truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Recent */}
        <div className="mt-4 px-2 hidden lg:block">
          <button
            onClick={() => setRecentOpen((o) => !o)}
            className="flex w-full items-center gap-1 px-2 py-1 text-[13px] text-text-faint hover:text-text-muted transition-colors duration-150"
          >
            {recentOpen
              ? <ChevronDown strokeWidth={1.6} className="h-3 w-3" />
              : <ChevronRight strokeWidth={1.6} className="h-3 w-3" />}
            Recent
          </button>
          {recentOpen && (
            <div className="mt-0.5 space-y-0.5">
              {RECENT.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex h-8 w-full items-center gap-[10px] rounded-[6px] px-2 text-[15px] text-text-secondary hover:bg-hover transition-colors duration-150"
                >
                  <div className="h-[14px] w-[14px] shrink-0 rounded-[3px] border border-border-active" />
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Bottom bar */}
        <div className="relative px-2 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setUserMenuOpen((o) => !o); setAppearanceOpen(false); }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white text-[11px] font-semibold hover:opacity-80 transition-opacity"
            >
              R
            </button>
            <button className="hidden lg:flex h-7 w-7 items-center justify-center rounded-[6px] text-text-muted hover:bg-hover hover:text-text-secondary transition-colors duration-150">
              <Keyboard strokeWidth={1.6} className="h-4 w-4" />
            </button>
            <button className="hidden lg:flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[15px] text-text-muted hover:bg-hover hover:text-text-secondary transition-colors duration-150">
              <ThumbsUp strokeWidth={1.6} className="h-3.5 w-3.5" />
              Share feedback
            </button>
          </div>

          {userMenuOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 w-52 rounded-[10px] border border-[#333] py-1.5 z-50"
              style={{ background: '#1E1E1E', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}
            >
              <div className="relative">
                <button
                  onClick={() => setAppearanceOpen((o) => !o)}
                  className="flex h-10 w-full items-center justify-between rounded-[8px] px-3 text-[15px] text-text hover:bg-[#2A2A2A] transition-colors duration-150"
                >
                  <div className="flex items-center gap-[10px]">
                    <Monitor strokeWidth={1.6} className="h-4 w-4 text-text-muted" />
                    Appearance
                  </div>
                  <ChevronRight strokeWidth={1.6} className="h-3.5 w-3.5 text-text-faint" />
                </button>
                {appearanceOpen && (
                  <div
                    className="absolute left-full top-0 ml-1 w-36 rounded-[10px] border border-[#333] py-1.5 z-50"
                    style={{ background: '#1E1E1E', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}
                  >
                    {([['system', Monitor, 'System'], ['light', Sun, 'Light'], ['dark', Moon, 'Dark']] as const).map(([mode, Icon, label]) => (
                      <button
                        key={mode}
                        onClick={() => applyAppearance(mode)}
                        className="flex h-10 w-full items-center justify-between rounded-[8px] px-3 text-[15px] text-text hover:bg-[#2A2A2A] transition-colors duration-150"
                      >
                        <div className="flex items-center gap-[10px]">
                          <Icon strokeWidth={1.6} className="h-4 w-4 text-text-muted" />
                          {label}
                        </div>
                        {appearance === mode && <span className="text-accent text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSettingsOpen(true); setUserMenuOpen(false); }}
                className="flex h-10 w-full items-center gap-[10px] rounded-[8px] px-3 text-[15px] text-text hover:bg-[#2A2A2A] transition-colors duration-150"
              >
                Settings
              </button>

              <div className="my-1 h-px bg-border" />

              <button className="flex h-10 w-full items-center gap-[10px] rounded-[8px] px-3 text-[15px] text-text hover:bg-[#2A2A2A] transition-colors duration-150">
                <LogOut strokeWidth={1.6} className="h-4 w-4 text-text-muted" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
