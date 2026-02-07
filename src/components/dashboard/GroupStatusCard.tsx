import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GroupStatusCardProps {
    groupId: string;
    groupName: string;
    athleteCount: number;
    completionRate: number;
}

function getStatusConfig(rate: number) {
    if (rate >= 80) {
        return {
            label: 'HIGH',
            color: 'text-green-500',
            bgColor: 'bg-green-500',
            variant: 'default' as const
        };
    } else if (rate >= 50) {
        return {
            label: 'ATTENTION NEEDED',
            color: 'text-orange-500',
            bgColor: 'bg-orange-500',
            variant: 'warning' as const
        };
    } else {
        return {
            label: 'OPTIMAL',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500',
            variant: 'default' as const
        };
    }
}

export function GroupStatusCard({ groupId, groupName, athleteCount, completionRate }: GroupStatusCardProps) {
    const status = getStatusConfig(completionRate);

    return (
        <Card className="border-border bg-card">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{groupName}</h3>
                        <p className="text-xs text-muted-foreground">
                            {athleteCount} Active Athlete{athleteCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className={`text-2xl font-bold ${status.color}`}>
                        {completionRate}%
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground uppercase tracking-wider">COMPLIANCE</span>
                        <span className="font-medium">{status.label}</span>
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
