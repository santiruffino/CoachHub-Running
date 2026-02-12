'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CriticalAlertItemProps {
    athleteId: string;
    athleteName: string;
    alertType: 'rpe_mismatch' | 'new_feedback' | 'low_compliance' | 'missing_workout';
    timestamp: string;
    message: string;
    details?: string;
    onAction?: (action: string, athleteId: string) => void;
}

const alertTypeConfig = {
    rpe_mismatch: {
        label: 'Fallo en RPE objetivo',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        badgeVariant: 'secondary' as const
    },
    new_feedback: {
        label: 'Nuevo comentario',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        badgeVariant: 'default' as const
    },
    low_compliance: {
        label: 'Bajo cumplimiento',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        badgeVariant: 'secondary' as const
    },
    missing_workout: {
        label: 'Sin entrenamientos',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        badgeVariant: 'destructive' as const
    }
};

export function CriticalAlertItem({
    athleteId,
    athleteName,
    alertType,
    timestamp,
    message,
    details,
    onAction
}: CriticalAlertItemProps) {
    const [expanded, setExpanded] = useState(false);
    const config = alertTypeConfig[alertType];

    return (
        <div className="border-b border-border last:border-0 py-4">
            <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="text-sm">
                        {athleteName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{athleteName}</span>
                            <span className="text-xs text-muted-foreground">{timestamp}</span>
                        </div>
                    </div>

                    <div className="mb-2">
                        <Badge variant={config.badgeVariant} className="mr-2 mb-1">
                            {config.label}
                        </Badge>
                        <span className="text-sm">{message}</span>
                    </div>

                    {details && expanded && (
                        <div className={`p-3 rounded-lg ${config.bgColor} mt-2 mb-3`}>
                            <p className="text-xs text-foreground/80">{details}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                        {alertType === 'rpe_mismatch' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => onAction?.('reply', athleteId)}
                                >
                                    Responder
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onAction?.('adjust_plan', athleteId)}
                                >
                                    Ajustar plan
                                </Button>
                            </>
                        )}
                        {alertType === 'new_feedback' && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => onAction?.('view_comment', athleteId)}
                            >
                                Ver comentario
                            </Button>
                        )}
                        {alertType === 'missing_workout' && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => onAction?.('flag_review', athleteId)}
                            >
                                Marcar para revisar
                            </Button>
                        )}

                        {details && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpanded(!expanded)}
                                className="ml-auto"
                            >
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
