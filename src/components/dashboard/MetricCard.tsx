import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: LucideIcon;
    accentColor: string;
    iconBgColor: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, accentColor, iconBgColor }: MetricCardProps) {
    return (
        <Card className="relative overflow-hidden border-border bg-card">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${iconBgColor}`}>
                            <Icon className={`h-5 w-5 ${accentColor}`} />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {title}
                        </h3>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="text-4xl font-bold">{value}</div>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
            </div>

            {/* Accent bar at bottom */}
            <div className={`h-1 w-full ${accentColor.replace('text-', 'bg-')}`} />
        </Card>
    );
}
