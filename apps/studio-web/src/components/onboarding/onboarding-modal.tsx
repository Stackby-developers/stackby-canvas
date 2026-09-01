'use client';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { Dialog, DialogContent, Button } from '@stackby/ui';
import { useOnboarding } from '@/src/hooks/use-onboarding';

export function OnboardingModal() {
  const { show, dismiss } = useOnboarding();
  const router = useRouter();

  function handleStart() {
    dismiss();
    router.push('/');
  }

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="max-w-sm text-center" aria-describedby="onboarding-desc">
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
            <Zap className="h-6 w-6 text-accent" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight text-text">
              Welcome to Stackby Studio
            </h2>
          </div>

          <div id="onboarding-desc" className="space-y-3 text-sm text-text-muted">
            <p>
              Describe what you need — get a real React app connected to your Stackby data in under 4 minutes.
            </p>
            <p>
              The code is yours: export to GitHub, publish to a custom URL, or embed anywhere.
            </p>
          </div>

          <Button className="w-full" onClick={handleStart}>
            Start building →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
