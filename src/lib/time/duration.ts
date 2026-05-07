export function parseDurationInput(rawValue: string): number | null {
    const value = rawValue.trim().toLowerCase().replace(/\s+/g, '');

    if (!value) return null;

    const colonParts = value.split(':');
    if (colonParts.length === 2 || colonParts.length === 3) {
        const numbers = colonParts.map((part) => Number(part));
        if (numbers.some((part) => Number.isNaN(part) || part < 0)) return null;

        if (colonParts.length === 2) {
            const [minutes, seconds] = numbers;
            return (minutes * 60) + seconds;
        }

        const [hours, minutes, seconds] = numbers;
        return (hours * 3600) + (minutes * 60) + seconds;
    }

    const hm = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (hm && hm[0].length > 0) {
        const hours = Number(hm[1] || 0);
        const minutes = Number(hm[2] || 0);
        const seconds = Number(hm[3] || 0);
        if ([hours, minutes, seconds].some((part) => Number.isNaN(part) || part < 0)) return null;
        return (hours * 3600) + (minutes * 60) + seconds;
    }

    const normalized = value.replace(',', '.');
    if (/^\d+(\.\d+)?$/.test(normalized)) {
        const minutes = Number(normalized);
        if (Number.isNaN(minutes) || minutes < 0) return null;
        return Math.round(minutes * 60);
    }

    return null;
}

export function formatSecondsToClock(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatSecondsToHhMmSs(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
}
