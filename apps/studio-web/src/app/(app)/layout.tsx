import type { ReactNode } from 'react';
import { AppShell } from '@/src/components/layout/app-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
