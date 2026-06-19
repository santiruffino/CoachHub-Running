export function normalizeOptionalNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}
