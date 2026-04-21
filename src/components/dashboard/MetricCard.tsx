import { Card } from '@/components/ui/card';

interface MetricCardProps {
    title: string;
    value: number | string;
    valueColor?: string;
}

export function MetricCard({ title, value, valueColor = 'text-foreground' }: MetricCardProps) {
    return (
        <Card className="relative overflow-hidden border-0 shadow-[0_2px_10px_rgba(43,52,55,0.02)] bg-card p-6 flex flex-col justify-center items-start min-w-[120px]">
            <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-4">
                {title}
            </h3>
            <div className={`text-3xl sm:text-4xl font-display font-medium leading-none tracking-tight ${valueColor}`}>
                {value}
            </div>
        </Card>
    );
}
