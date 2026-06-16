'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BackButtonProps {
    href?: string;
    label?: string;
    showLabel?: boolean;
    className?: string;
    onClick?: () => void;
    variant?: 'default' | 'outline' | 'ghost' | 'orange' | 'outline-brand';
}

export function BackButton({ 
    href, 
    label, 
    showLabel = false, 
    className = '',
    onClick,
    variant = 'ghost'
}: BackButtonProps) {
    const router = useRouter();
    const t = useTranslations('common');
    
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    const defaultLabel = t('navigateBack') || 'Volver';

    const isIconOnly = !showLabel && !label;
    const buttonVariant = variant === 'outline-brand' ? 'outline' : variant;

    return (
        <Button
            variant={buttonVariant}
            size={isIconOnly ? 'icon' : 'default'}
            onClick={handleClick}
            className={isIconOnly 
                ? `h-8 w-8 text-muted-foreground hover:text-foreground transition-colors ${className}`
                : `flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold ${className}`}
            style={isIconOnly ? undefined : { fontFamily: 'var(--font-plex-mono, monospace)' }}
            aria-label={label || defaultLabel}
        >
            <ArrowLeft className="h-4 w-4" />
            {!isIconOnly && <span>{label || defaultLabel}</span>}
        </Button>
    );
}

export function BackButtonWithLabel({ 
    href, 
    label, 
    className = '',
    onClick,
    variant = 'ghost'
}: BackButtonProps) {
    const router = useRouter();
    const t = useTranslations('common');
    
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    const defaultLabel = t('navigateBack') || 'Volver';
    const buttonVariant = variant === 'outline-brand' ? 'outline' : variant;

    return (
        <Button
            variant={buttonVariant}
            onClick={handleClick}
            className={`flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold ${className}`}
            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
        >
            <ArrowLeft className="w-4 h-4" />
            <span>{label || defaultLabel}</span>
        </Button>
    );
}