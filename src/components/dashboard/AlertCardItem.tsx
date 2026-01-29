import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AlertCardItemProps {
  name: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'info' | 'error';
  };
  details?: string;
  progress?: {
    value: number;
    label: string;
    color?: string;
  };
  className?: string;
}

export function AlertCardItem({
  name,
  subtitle,
  badge,
  details,
  progress,
  className,
}: AlertCardItemProps) {
  return (
    <div className={cn('py-3 first:pt-0', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">{name}</p>
            {badge && (
              <Badge
                variant={
                  badge.variant === 'error' ? 'destructive' :
                    badge.variant === 'warning' ? 'secondary' :
                      badge.variant === 'info' ? 'default' :
                        (badge.variant as any) || 'default'
                }
                className="shrink-0"
              >
                {badge.label}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {details && (
            <p className="text-xs text-muted-foreground mt-1">{details}</p>
          )}
          {progress && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">{progress.label}</p>
              <Progress
                value={progress.value}
                className="h-2"
                indicatorClassName={progress.color}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}