'use client';

import { Badge } from '@/components/ui/badge';

type LapFilter = 'all' | 'warmup' | 'active' | 'recovery' | 'cooldown';

export type { LapFilter };

interface LapFilterBadgesProps {
    value: LapFilter;
    onChange: (value: LapFilter) => void;
    t: (key: string) => string;
    className?: string;
}

const FILTER_BASE = 'cursor-pointer text-[10px] font-bold uppercase tracking-widest px-3 py-1 transition-colors';

export function LapFilterBadges({ value, onChange, t, className = '' }: LapFilterBadgesProps) {
    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <Badge
                variant={value === 'all' ? 'default' : 'outline'}
                className={FILTER_BASE}
                onClick={() => onChange('all')}
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {t('lapFilters.all')}
            </Badge>
            <Badge
                variant={value === 'warmup' ? 'default' : 'outline'}
                className={`${FILTER_BASE} ${value !== 'warmup' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' : ''}`}
                onClick={() => onChange('warmup')}
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {t('lapFilters.warmup')}
            </Badge>
            <Badge
                variant={value === 'active' ? 'default' : 'outline'}
                className={`${FILTER_BASE} ${value !== 'active' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : ''}`}
                onClick={() => onChange('active')}
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {t('lapFilters.active')}
            </Badge>
            <Badge
                variant={value === 'recovery' ? 'default' : 'outline'}
                className={`${FILTER_BASE} ${value !== 'recovery' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' : ''}`}
                onClick={() => onChange('recovery')}
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {t('lapFilters.recovery')}
            </Badge>
            <Badge
                variant={value === 'cooldown' ? 'default' : 'outline'}
                className={`${FILTER_BASE} ${value !== 'cooldown' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20' : ''}`}
                onClick={() => onChange('cooldown')}
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {t('lapFilters.cooldown')}
            </Badge>
        </div>
    );
}
