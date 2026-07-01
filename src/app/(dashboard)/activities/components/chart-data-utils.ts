export type Resolution = 'low' | 'medium' | 'high';

export const movingAverage = (data: (number | null)[], windowSize: number): (number | null)[] => {
    if (!data || data.length === 0) return [];

    const result: (number | null)[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;

        for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
            const value = data[j];
            if (value !== null && value !== undefined) {
                sum += value;
                count++;
            }
        }

        result.push(count > 0 ? sum / count : null);
    }

    return result;
};

export const downsampleLTTB = <T>(
    data: T[],
    threshold: number,
    getValue: (point: T) => number | null | undefined,
): T[] => {
    if (!data || data.length === 0) return [];
    if (threshold <= 0 || data.length <= threshold || threshold < 3) return data.slice();

    const sampled: T[] = [data[0]];
    const every = (data.length - 2) / (threshold - 2);
    let a = 0;

    for (let i = 0; i < threshold - 2; i++) {
        const rangeStart = Math.floor(i * every) + 1;
        const rangeEnd = Math.floor((i + 1) * every) + 1;

        const avgRangeStart = Math.floor((i + 1) * every) + 1;
        const avgRangeEnd = Math.floor((i + 2) * every) + 1;

        let avgX = 0;
        let avgY = 0;
        let avgCount = 0;

        for (let j = avgRangeStart; j < Math.min(avgRangeEnd, data.length); j++) {
            const value = getValue(data[j]);
            if (value === null || value === undefined) continue;

            avgX += j;
            avgY += value;
            avgCount++;
        }

        if (avgCount === 0) {
            avgX = Math.min(avgRangeStart, data.length - 1);
            avgY = getValue(data[avgX]) ?? 0;
            avgCount = 1;
        }

        avgX /= avgCount;
        avgY /= avgCount;

        let maxArea = -1;
        let nextA = rangeStart;
        const pointAx = a;
        const pointAy = getValue(data[a]) ?? 0;

        for (let j = rangeStart; j < Math.min(rangeEnd, data.length - 1); j++) {
            const pointY = getValue(data[j]);
            if (pointY === null || pointY === undefined) continue;

            const area = Math.abs((pointAx - avgX) * (pointY - pointAy) - (pointAx - j) * (avgY - pointAy));
            if (area > maxArea) {
                maxArea = area;
                nextA = j;
            }
        }

        sampled.push(data[nextA]);
        a = nextA;
    }

    sampled.push(data[data.length - 1]);
    return sampled;
};
