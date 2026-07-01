/**
 * Grade Adjusted Pace (GAP) based on Minetti et al. (2002) metabolic cost of
 * running on gradients. Converts an uphill/downhill pace into the equivalent
 * flat-ground pace so trail efforts can be compared like-for-like.
 */

const FLAT_COST = 3.6; // Minetti C(0), J/(kg*m)

/**
 * Energy cost of running per kg per meter at a given grade.
 * @param gradeDecimal slope as rise/run, e.g. 0.1 for +10%, -0.05 for -5%.
 */
export function minettiCost(gradeDecimal: number): number {
  const i = Math.max(-0.45, Math.min(0.45, gradeDecimal));
  return (
    155.4 * i ** 5 -
    30.4 * i ** 4 -
    43.3 * i ** 3 +
    46.3 * i ** 2 +
    19.5 * i +
    3.6
  );
}

/**
 * Converts an actual speed at a given grade into the equivalent flat speed.
 */
export function gradeAdjustedSpeed(speedMps: number, gradeDecimal: number): number {
  if (speedMps <= 0) return 0;
  const costRatio = minettiCost(gradeDecimal) / FLAT_COST;
  return speedMps * costRatio;
}

export type GapStreamInput = {
  distance: number[];
  altitude: number[];
  velocity: number[];
};

/**
 * Builds a per-sample grade-adjusted speed series from distance/altitude/velocity
 * streams. Grade is derived from a smoothed altitude/distance delta rather than
 * relying on Strava's grade_smooth, which isn't always present.
 */
export function buildGapSpeedSeries(input: GapStreamInput, smoothingWindow = 5): number[] {
  const { distance, altitude, velocity } = input;
  const length = Math.min(distance.length, altitude.length, velocity.length);
  if (length === 0) return [];

  const grades: number[] = new Array(length).fill(0);
  for (let i = 0; i < length; i++) {
    const start = Math.max(0, i - smoothingWindow);
    const end = Math.min(length - 1, i + smoothingWindow);
    const distanceDelta = distance[end] - distance[start];
    const altitudeDelta = altitude[end] - altitude[start];
    grades[i] = distanceDelta > 1 ? altitudeDelta / distanceDelta : 0;
  }

  return velocity.slice(0, length).map((speed, i) => gradeAdjustedSpeed(speed, grades[i]));
}

/**
 * Average grade-adjusted pace (min/km) for a whole activity, given total
 * distance and the per-sample GAP speed series.
 */
export function averageGapPaceMinPerKm(gapSpeeds: number[]): number | null {
  const validSpeeds = gapSpeeds.filter((s) => s > 0.2);
  if (validSpeeds.length === 0) return null;
  const avgSpeed = validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length;
  return 1000 / (avgSpeed * 60);
}
