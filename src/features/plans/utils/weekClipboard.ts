'use client';

/**
 * Tiny sessionStorage-backed clipboard for the calendar "copy week / paste week"
 * flow. Persists across athlete navigations within a tab so a coach can copy a
 * week from one athlete and paste it onto another.
 */

const KEY = 'endurix.weekClipboard';

export interface WeekClipboard {
    sourceUserId: string;
    /** Monday (or any day) of the copied week, ISO or yyyy-MM-dd. */
    weekStart: string;
    /** Human label for UI (athlete name + week range). */
    label: string;
}

export function setWeekClipboard(value: WeekClipboard): void {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(value));
        window.dispatchEvent(new Event('endurix:weekclipboard'));
    } catch {
        // sessionStorage unavailable (SSR/private mode) — no-op.
    }
}

export function getWeekClipboard(): WeekClipboard | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as WeekClipboard) : null;
    } catch {
        return null;
    }
}

export function clearWeekClipboard(): void {
    try {
        sessionStorage.removeItem(KEY);
        window.dispatchEvent(new Event('endurix:weekclipboard'));
    } catch {
        // no-op
    }
}
