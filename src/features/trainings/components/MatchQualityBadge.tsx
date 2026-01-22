'use client';

import { Badge } from '@/components/ui/badge';
import { getMatchScoreColor, getMatchScoreBgColor, getMatchCategory } from '../utils/matchingUtils';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface MatchQualityBadgeProps {
    score: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function MatchQualityBadge({ score, showLabel = false, size = 'md' }: MatchQualityBadgeProps) {
    const category = getMatchCategory(score);
    const colorClass = getMatchScoreColor(score);
    const bgColorClass = getMatchScoreBgColor(score);

    const Icon = score >= 85 ? CheckCircle2 : score >= 70 ? AlertCircle : XCircle;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    return (
        <Badge
            variant="outline"
            className={`${bgColorClass} ${colorClass} border-none font-semibold ${sizeClasses[size]} flex items-center gap-1.5`}
        >
            <Icon className={iconSizes[size]} />
            <span>{score}%</span>
            {showLabel && <span className="ml-1 font-normal opacity-80">- {category}</span>}
        </Badge>
    );
}
