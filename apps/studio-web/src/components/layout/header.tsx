import { Zap } from 'lucide-react';
import { Badge, Avatar, AvatarFallback } from '@stackby/ui';

interface HeaderProps {
  creditBalance?: number;
  creditTotal?: number;
  userInitials?: string;
}

export function Header({ creditBalance, creditTotal, userInitials = 'U' }: HeaderProps) {
  const lowCredits =
    creditBalance !== undefined &&
    creditTotal !== undefined &&
    creditTotal > 0 &&
    creditBalance / creditTotal <= 0.2;

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <span className="text-sm font-semibold tracking-tight text-text">Stackby Studio</span>

      <div className="flex items-center gap-3">
        {creditBalance !== undefined && (
          <div className="flex items-center gap-1.5">
            <Zap
              className={`h-3.5 w-3.5 ${lowCredits ? 'text-warning' : 'text-text-faint'}`}
              aria-hidden="true"
            />
            <Badge variant={lowCredits ? 'warning' : 'outline'} className="tabular-nums">
              {creditBalance.toLocaleString()} credits
            </Badge>
          </div>
        )}
        <Avatar className="h-7 w-7 cursor-pointer">
          <AvatarFallback className="text-[10px]">{userInitials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
