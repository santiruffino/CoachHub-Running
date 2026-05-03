import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface GroupStatusCardProps {
    groupId: string;
    groupName: string;
    athleteCount: number;
    completionRate: number;
}

function getStatusConfig(rate: number, t: (key: string, values?: Record<string, string | number>) => string) {
    if (rate >= 80) {
        return {
            label: t('dashboard.groupStatus.high'),
            color: 'text-green-500',
            bgColor: 'bg-green-500',
            variant: 'default' as const
        };
    } else if (rate >= 50) {
        return {
            label: t('dashboard.groupStatus.attentionNeeded'),
            color: 'text-orange-500',
            bgColor: 'bg-orange-500',
            variant: 'warning' as const
        };
    } else {
        return {
            label: t('dashboard.groupStatus.critical') || 'Crítico',
            color: 'text-red-500',
            bgColor: 'bg-red-500',
            variant: 'destructive' as const
        };
    }
}

export function GroupStatusCard({ groupId, groupName, athleteCount, completionRate }: GroupStatusCardProps) {
    void groupId;
    const t = useTranslations();
    const status = getStatusConfig(completionRate, t);

    return (
        <Card className="border-0 shadow-sm bg-card hover:shadow-[0_8px_30px_rgba(43,52,55,0.06)] transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1 tracking-[0.01em]">{groupName}</h3>
                        <p className="text-xs text-muted-foreground tracking-[0.01em]">
                            {t('dashboard.groupStatus.activeAthletes', { count: athleteCount })}
                        </p>
                    </div>
                    <div className={`text-2xl font-display font-medium tracking-tight ${status.color}`}>
                        {completionRate}%
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('dashboard.groupStatus.compliance')}</span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider">{status.label}</span>
                    </div>

                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full ${status.bgColor} transition-all duration-300`}
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
