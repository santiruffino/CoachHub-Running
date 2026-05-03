'use client';

import { Badge } from '@/components/ui/badge';

type LapFilter = 'all' | 'warmup' | 'active' | 'recovery' | 'cooldown';

interface LapFilterBadgesProps {
    value: LapFilter;
    onChange: (value: LapFilter) => void;
    t: (key: string) => string;
}

export function LapFilterBadges({ value, onChange, t }: LapFilterBadgesProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 mb-6">
            <Badge
                variant={value === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => onChange('all')}
            >
                {t('lapFilters.all')}
            </Badge>
            <Badge
                variant={value === 'warmup' ? 'default' : 'outline'}
                className={`cursor-pointer ${value !== 'warmup' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' : ''}`}
                onClick={() => onChange('warmup')}
            >
                {t('lapFilters.warmup')}
            </Badge>
            <Badge
                variant={value === 'active' ? 'default' : 'outline'}
                className={`cursor-pointer ${value !== 'active' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : ''}`}
                onClick={() => onChange('active')}
            >
                {t('lapFilters.active')}
            </Badge>
            <Badge
                variant={value === 'recovery' ? 'default' : 'outline'}
                className={`cursor-pointer ${value !== 'recovery' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' : ''}`}
                onClick={() => onChange('recovery')}
            >
                {t('lapFilters.recovery')}
            </Badge>
            <Badge
                variant={value === 'cooldown' ? 'default' : 'outline'}
                className={`cursor-pointer ${value !== 'cooldown' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20' : ''}`}
                onClick={() => onChange('cooldown')}
            >
                {t('lapFilters.cooldown')}
            </Badge>
        </div>
    );
}
