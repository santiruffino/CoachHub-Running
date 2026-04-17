'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CriticalAlertItemProps {
    athleteId: string;
    athleteName: string;
    alertType: 'rpe_mismatch' | 'new_feedback' | 'low_compliance' | 'missing_workout';
    timestamp: string;
    message: string;
    details?: string;
}

export function CriticalAlertItem({
    athleteName,
    alertType,
    timestamp,
    message,
}: CriticalAlertItemProps) {
    
    // Simulate real plan data for the design demo if not provided
    const planSub = "Marathon Plan • Week 12";

    // Format the alert message to look like the image (e.g. MISSED: INTERVAL SESSION)
    let formattedMessage = message.toUpperCase();
    let messageColor = "text-red-500/90";
    
    if (alertType === 'rpe_mismatch') {
        formattedMessage = "RPE MISMATCH";
        messageColor = "text-orange-500/90";
    }

    return (
        <div className="bg-card rounded-lg p-4 flex items-center gap-4 border-0 shadow-[0_2px_10px_rgba(43,52,55,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgba(43,52,55,0.06)]">
            <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                    {athleteName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{athleteName}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{planSub}</p>
            </div>
            
            <div className="text-right flex flex-col items-end">
                <span className={`text-[10px] tracking-wide font-semibold ${messageColor}`}>
                    {formattedMessage}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">
                    {timestamp}
                </span>
            </div>
        </div>
    );
}
