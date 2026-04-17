import { cn } from '@/lib/utils';

/** One editorial section: left label column + right content column */
export function SectionLayout({
    tag,
    title,
    description,
    children,
}: {
    tag: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 md:gap-12 py-10 border-b border-border/20 last:border-0">
            {/* Left: meta */}
            <div className="space-y-1.5">
                <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">
                    {tag}
                </p>
                <h2 className="text-base font-display font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
            {/* Right: slot */}
            <div>{children}</div>
        </div>
    );
}

/** Muted card wrapper that groups fields */
export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('bg-muted/40 rounded-xl p-6 space-y-5', className)}>
            {children}
        </div>
    );
}

/** Two-column grid row for side-by-side inputs */
export function FieldRow({
    children,
    cols = 2,
}: {
    children: React.ReactNode;
    cols?: 2 | 3;
}) {
    return (
        <div
            className={cn(
                'grid gap-5',
                cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
            )}
        >
            {children}
        </div>
    );
}

/** Labelled field slot with optional error */
export function Field({
    label,
    error,
    children,
    hint,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">
                {label}
            </p>
            {children}
            {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

/** Borderless underline input class string */
export const underlineInput =
    'bg-background border-0 border-b border-border/40 rounded-none h-10 px-0 focus-visible:ring-0 focus-visible:border-foreground/50 transition-colors text-sm';

/** Disabled/locked input class string */
export const disabledInput =
    'bg-muted/60 border-0 border-b border-border/20 rounded-none h-10 px-0 focus-visible:ring-0 text-muted-foreground cursor-not-allowed text-sm';

/** Gender toggle options */
export const GENDER_OPTIONS = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' },
    { value: 'OTHER', label: 'Otro' },
];

/** Pill-style gender toggle button group */
export function GenderToggle({
    selected,
    onChange,
}: {
    selected: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex gap-2 pt-1">
            {GENDER_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        'flex-1 py-2 px-3 text-sm rounded-md border transition-all duration-150 font-medium',
                        selected === opt.value
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background text-muted-foreground border-border/40 hover:border-foreground/30 hover:text-foreground'
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
