'use client';

import { useMemo, useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLEX = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;

export interface SelectItem {
    id: string;
    label: string;
    subLabel?: string;
}

/**
 * Searchable multi-select chip picker matching the assign-workout aesthetic.
 * Extracted for reuse across the plan apply / copy-week flows.
 */
export function SearchableMultiSelect({
    items,
    selectedIds,
    onChange,
    placeholder,
    noMatchesLabel,
}: {
    items: SelectItem[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    placeholder: string;
    noMatchesLabel: string;
}) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(
            (item) => item.label.toLowerCase().includes(q) || (item.subLabel && item.subLabel.toLowerCase().includes(q)),
        );
    }, [items, search]);

    const toggleItem = (id: string) => {
        onChange(selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id]);
    };

    return (
        <div className="relative w-full">
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedIds.map((id) => {
                        const item = items.find((i) => i.id === id);
                        if (!item) return null;
                        return (
                            <div
                                key={id}
                                className="flex items-center bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30 px-3 py-1 text-xs font-semibold tracking-wide"
                                style={PLEX}
                            >
                                {item.label}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(selectedIds.filter((v) => v !== id));
                                    }}
                                    className="ml-2 text-endurix-orange/70 hover:text-endurix-orange"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-endurix-orange" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 pl-11 pr-0 py-2 text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange placeholder-endurix-black/30 dark:placeholder:text-muted-foreground/50 transition-colors"
                />
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15 max-h-60 overflow-y-auto w-full">
                        {filtered.length === 0 ? (
                            <div
                                className="p-4 text-xs tracking-widest text-endurix-black/50 dark:text-muted-foreground uppercase font-bold text-center"
                                style={PLEX}
                            >
                                {noMatchesLabel}
                            </div>
                        ) : (
                            filtered.map((item) => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleItem(item.id)}
                                        className={cn(
                                            'w-full flex items-center justify-between px-4 py-3 hover:bg-endurix-orange/5 dark:hover:bg-endurix-orange/10 transition-colors text-left border-b border-endurix-black/8 dark:border-white/8 last:border-b-0',
                                            isSelected && 'bg-endurix-orange/10',
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span
                                                className={cn(
                                                    'text-sm font-semibold transition-colors',
                                                    isSelected ? 'text-endurix-orange' : 'text-endurix-black dark:text-foreground',
                                                )}
                                            >
                                                {item.label}
                                            </span>
                                            {item.subLabel && <span className="text-xs text-muted-foreground">{item.subLabel}</span>}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-endurix-orange" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
