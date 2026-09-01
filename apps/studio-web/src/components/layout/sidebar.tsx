'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FolderOpen, Palette, LayoutTemplate, ShieldCheck } from 'lucide-react';
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@stackby/ui';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { href: '/design-systems', icon: Palette, label: 'Design Systems' },
] as const;

const ADMIN_ITEM = { href: '/admin', icon: ShieldCheck, label: 'Admin' } as const;

interface SidebarProps {
  isAdmin?: boolean | undefined;
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : [...NAV_ITEMS];

  return (
    <aside className="flex h-full w-14 flex-col items-center gap-1 border-r border-border bg-bg-elevated py-3">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
        <span className="text-xs font-bold text-accent-fg">S</span>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1" aria-label="Main navigation">
        {items.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-faint hover:bg-bg-muted hover:text-text-muted',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
