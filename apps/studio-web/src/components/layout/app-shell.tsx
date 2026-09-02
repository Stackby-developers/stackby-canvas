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
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        {/* Floating panel: inset 12px top/right/bottom, flush left */}
        <div className="flex-1 mt-3 mr-3 mb-3 overflow-hidden">
          <div className="h-full w-full rounded-2xl border border-border bg-bg-elevated overflow-auto">
            {children}
          </div>
        </div>
      </div>
      <OnboardingModal />
    </TooltipProvider>
  );
}
