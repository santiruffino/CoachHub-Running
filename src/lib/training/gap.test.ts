import { describe, expect, it } from 'vitest';
import { averageGapPaceMinPerKm, buildGapSpeedSeries, gradeAdjustedSpeed, minettiCost } from './gap';

describe('minettiCost', () => {
  it('returns the flat baseline cost at 0% grade', () => {
    expect(minettiCost(0)).toBeCloseTo(3.6, 1);
  });

  it('increases cost for uphill grades', () => {
    expect(minettiCost(0.1)).toBeGreaterThan(minettiCost(0));
    expect(minettiCost(0.2)).toBeGreaterThan(minettiCost(0.1));
  });

  it('decreases cost for moderate downhill before rising again on steep descents', () => {
    expect(minettiCost(-0.1)).toBeLessThan(minettiCost(0));
    expect(minettiCost(-0.4)).toBeGreaterThan(minettiCost(-0.2));
  });
});

describe('gradeAdjustedSpeed', () => {
  it('keeps speed unchanged on flat ground', () => {
    expect(gradeAdjustedSpeed(3, 0)).toBeCloseTo(3, 5);
  });

  it('boosts equivalent flat speed for uphill efforts', () => {
    const flatSpeed = gradeAdjustedSpeed(3, 0);
    const uphillSpeed = gradeAdjustedSpeed(3, 0.1);
    expect(uphillSpeed).toBeGreaterThan(flatSpeed);
  });

  it('returns 0 for non-positive speed', () => {
    expect(gradeAdjustedSpeed(0, 0.1)).toBe(0);
    expect(gradeAdjustedSpeed(-1, 0.1)).toBe(0);
  });
});

describe('buildGapSpeedSeries', () => {
  it('derives grade from distance/altitude deltas and adjusts speed', () => {
    const series = buildGapSpeedSeries({
      distance: [0, 10, 20, 30, 40],
      altitude: [100, 101, 102, 103, 104], // steady +10% grade
      velocity: [3, 3, 3, 3, 3],
    });

    expect(series).toHaveLength(5);
    series.forEach((speed) => expect(speed).toBeGreaterThan(3));
  });

  it('returns an empty array when inputs are empty', () => {
    expect(buildGapSpeedSeries({ distance: [], altitude: [], velocity: [] })).toEqual([]);
  });
});

describe('averageGapPaceMinPerKm', () => {
  it('returns null when there is no meaningful speed data', () => {
    expect(averageGapPaceMinPerKm([0, 0.1])).toBeNull();
  });

  it('computes pace in minutes per km from average speed', () => {
    // 1000 / (5 m/s * 60) = 3.33 min/km
    expect(averageGapPaceMinPerKm([5, 5, 5])).toBeCloseTo(3.33, 2);
  });
});
