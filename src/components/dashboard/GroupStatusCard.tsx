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
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-600 dark:bg-emerald-400',
        };
    } else if (rate >= 50) {
        return {
            label: t('dashboard.groupStatus.attentionNeeded'),
            color: 'text-endurix-orange',
            bgColor: 'bg-endurix-orange',
        };
    } else {
        return {
            label: t('dashboard.groupStatus.critical') || 'Crítico',
            color: 'text-endurix-orange',
            bgColor: 'bg-endurix-orange',
        };
    }
}

export function GroupStatusCard({ groupId, groupName, athleteCount, completionRate }: GroupStatusCardProps) {
    void groupId;
    const t = useTranslations();
    const status = getStatusConfig(completionRate, t);

    return (
        <Card className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1">
                        <h3
                            className="text-sm font-bold uppercase tracking-widest text-endurix-black dark:text-foreground"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >{groupName}</h3>
                        <p
                            className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground mt-1"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {t('dashboard.groupStatus.activeAthletes', { count: athleteCount })}
                        </p>
                    </div>
                    <div
                        className={`text-3xl font-bold tracking-tight ${status.color}`}
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        {completionRate}%
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span
                            className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{t('dashboard.groupStatus.compliance')}</span>
                        <span
                            className={`text-[10px] uppercase font-bold tracking-widest ${status.color}`}
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{status.label}</span>
                    </div>

                    <div className="w-full h-1.5 bg-endurix-black/15 dark:bg-border overflow-hidden">
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
