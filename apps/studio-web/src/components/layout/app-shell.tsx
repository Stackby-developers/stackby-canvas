import type { ReactNode } from 'react';
import { TooltipProvider } from '@stackby/ui';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { OnboardingModal } from '@/src/components/onboarding/onboarding-modal';

interface AppShellProps {
  children: ReactNode;
  isAdmin?: boolean | undefined;
}

export function AppShell({ children, isAdmin }: AppShellProps) {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <OnboardingModal />
    </TooltipProvider>
  );
}
