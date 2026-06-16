'use client';

import type { ReactNode } from 'react';
import { Moon } from 'lucide-react';

interface CalendarRestDayPlaceholderProps {
    className: string;
    iconClassName: string;
    label: ReactNode;
}

export function CalendarRestDayPlaceholder({ className, iconClassName, label }: CalendarRestDayPlaceholderProps) {
    return (
        <div className={className}>
            <Moon className={iconClassName} />
            {label}
        </div>
    );
}
