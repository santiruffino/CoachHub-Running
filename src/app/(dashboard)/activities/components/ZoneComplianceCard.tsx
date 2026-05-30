'use client';

import { useTranslations } from 'next-intl';

interface ZoneComplianceCardProps {
    compliance: {
        compliance_score: number;
        is_violation: boolean;
        violation_details: {
            targets: number[];
            distribution: Array<{
                min: number;
                max: number;
                time: number;
            }>;
        };
    };
}

export function ZoneComplianceCard({ compliance }: ZoneComplianceCardProps) {
    const t = useTranslations('activities.detail.compliance');

    const score = Math.round(compliance.compliance_score);
    const radius = 54;
    const stroke = 8;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center text-center">
            <div className="relative">
                <svg height={radius * 2} width={radius * 2} className="-rotate-90">
                    <circle
                        stroke="hsl(var(--border))"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke="#FF6800"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span
                        className="text-3xl font-bold text-endurix-black dark:text-foreground"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        {score}%
                    </span>
                </div>
            </div>
            <span
                className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mt-3"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {t('title')}
            </span>
            <p className="text-xs text-endurix-black/50 dark:text-muted-foreground mt-1 max-w-[180px]">
                {compliance.is_violation ? t('violationDesc') : t('compliantDesc')}
            </p>
        </div>
    );
}
