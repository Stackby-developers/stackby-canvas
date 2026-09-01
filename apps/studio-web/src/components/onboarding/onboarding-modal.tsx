'use client';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Pencil } from 'lucide-react';
import { Dialog, DialogContent } from '@stackby/ui';
import { useOnboarding } from '@/src/hooks/use-onboarding';

export function OnboardingModal() {
  const { show, dismiss } = useOnboarding();
  const router = useRouter();

  function handleStart() {
    dismiss();
    router.push('/');
  }

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <div className="flex h-[440px]">
          {/* Left: blue grid */}
          <div className="relative w-[240px] shrink-0 overflow-hidden bg-gradient-to-br from-sky-400 to-sky-700">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-sky-300/30" />
              ))}
            </div>
          </div>

          {/* Right: content */}
          <div className="flex flex-1 flex-col justify-between p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-text">
                  <span className="text-[10px] font-bold text-bg">S</span>
                </div>
                <span className="text-sm font-semibold text-text-muted">Studio</span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-text">Meet Studio</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <LayoutDashboard className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
                  <p className="text-sm text-text">Build custom apps from your Stackby data.</p>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-start gap-3">
                  <Pencil className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
                  <p className="text-sm text-text">
                    Start with a prompt, refine in chat, and publish for people who can access the connected stack.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full rounded-full bg-text py-3 text-sm font-semibold text-bg hover:opacity-80 transition-opacity"
            >
              Start building →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
