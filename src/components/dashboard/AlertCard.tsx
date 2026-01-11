import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  variant: 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

const variantStyles = {
  warning: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30',
  error: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
  info: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30',
};

const iconStyles = {
  warning: 'text-orange-600 dark:text-orange-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-yellow-600 dark:text-yellow-400',
};

export function AlertCard({
  title,
  description,
  icon: Icon,
  variant,
  children,
}: AlertCardProps) {
  return (
    <Card className={cn('border-l-4', variantStyles[variant])}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Icon className={cn('h-5 w-5', iconStyles[variant])} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">{children}</CardContent>
    </Card>
  );
}