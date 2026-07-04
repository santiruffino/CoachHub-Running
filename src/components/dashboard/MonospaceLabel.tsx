import * as React from 'react';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;

type LabelColor = 'muted' | 'default' | 'primary' | 'danger' | 'orange';

const colorMap: Record<LabelColor, string> = {
    muted: 'text-endurix-black/50 dark:text-muted-foreground',
    default: 'text-endurix-black dark:text-foreground',
    primary: 'text-endurix-black/80 dark:text-foreground',
    danger: 'text-destructive',
    orange: 'text-endurix-orange',
};

const sizeMap = {
    micro: 'text-[8px] tracking-widest',
    xs: 'text-[9px] tracking-widest',
    sm: 'text-[10px] tracking-widest',
} as const;

export interface MonospaceLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    color?: LabelColor;
    size?: keyof typeof sizeMap;
    weight?: 'normal' | 'semibold' | 'bold';
    uppercase?: boolean;
}

export function MonospaceLabel({
    children,
    color = 'muted',
    size = 'xs',
    weight = 'semibold',
    uppercase = true,
    className,
    ...props
}: MonospaceLabelProps) {
    return (
        <span
            className={cn(
                sizeMap[size],
                colorMap[color],
                weight === 'semibold' && 'font-semibold',
                weight === 'bold' && 'font-bold',
                uppercase && 'uppercase',
                className,
            )}
            style={FONT_MONO}
            {...props}
        >
            {children}
        </span>
    );
}
