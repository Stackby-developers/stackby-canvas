import type { ReactNode } from 'react';
import { TooltipProvider } from '@stackby/ui';
import { Sidebar } from './sidebar';
import { OnboardingModal } from '@/src/components/onboarding/onboarding-modal';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-bg">{children}</main>
      </div>
      <OnboardingModal />
    </TooltipProvider>
  );
}
