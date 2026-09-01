import { getWcagLevel } from '@/src/lib/wcag';
import { Badge } from '@stackby/ui';

interface WcagBadgeProps {
  ratio: number;
}

export function WcagBadge({ ratio }: WcagBadgeProps) {
  const level = getWcagLevel(ratio);
  const variant =
    level === 'AAA' || level === 'AA'
      ? 'success'
      : level === 'AA Large'
        ? 'warning'
        : 'destructive';
  return (
    <Badge variant={variant}>
      {level} {ratio.toFixed(1)}:1
    </Badge>
  );
}
