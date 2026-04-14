import { describe, it, expect } from 'vitest';
import { getWeekNumber } from '../getWeekNumber.js';

describe('getWeekNumber', () => {
  it('returns week 1 for January 1, 2026 (ISO week 1 — Thursday)', () => {
    // Jan 1, 2026 is a Thursday — ISO week 1
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });

  it('returns week 1 for December 31, 2025 (part of ISO week 1 of 2026)', () => {
    // Dec 31, 2025 is a Wednesday — belongs to ISO week 1 of 2026
    // ISO algorithm: the week containing January 4th defines week 1
    // Dec 29-31, 2025 belong to week 1 of 2026
    expect(getWeekNumber(new Date(2025, 11, 31))).toBe(1);
  });

  it('returns correct week number for a known mid-year date', () => {
    // July 1, 2026 is a Wednesday — ISO week 27
    const week = getWeekNumber(new Date(2026, 6, 1));
    expect(week).toBe(27);
  });

  it('returns consistent results when called multiple times with the same date', () => {
    const date = new Date(2026, 3, 15); // April 15, 2026
    const first = getWeekNumber(date);
    const second = getWeekNumber(date);
    const third = getWeekNumber(date);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('returns a week number between 1 and 53 for all months of a year', () => {
    for (let month = 0; month < 12; month++) {
      const week = getWeekNumber(new Date(2026, month, 15));
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    }
  });

  it('week number increases monotonically within a year', () => {
    const weeks = [];
    for (let month = 0; month < 12; month++) {
      weeks.push(getWeekNumber(new Date(2026, month, 1)));
    }
    // Each month's week 1 day should have a >= week number than the prior month's
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i]).toBeGreaterThanOrEqual(weeks[i - 1]);
    }
  });

  it('returns correct week for January 4 (always in ISO week 1)', () => {
    // ISO 8601: January 4 is always in week 1
    expect(getWeekNumber(new Date(2026, 0, 4))).toBe(1);
    expect(getWeekNumber(new Date(2025, 0, 4))).toBe(1);
  });
});
