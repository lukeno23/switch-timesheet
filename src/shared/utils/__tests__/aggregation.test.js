import { describe, it, expect } from 'vitest';
import { buildTrendData } from '../aggregation.js';

// Helper to create test data entries with proper dateObj
const makeEntry = (day, month, year, minutes) => ({
  dateStr: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
  dateObj: new Date(year, month - 1, day),
  minutes,
});

describe('buildTrendData', () => {
  describe('empty input', () => {
    it('returns empty array for empty data', () => {
      expect(buildTrendData([], 'day')).toHaveLength(0);
      expect(buildTrendData([], 'week')).toHaveLength(0);
      expect(buildTrendData([], 'month')).toHaveLength(0);
    });
  });

  describe('day timeframe', () => {
    it('groups entries from the same day into one bucket', () => {
      const data = [
        makeEntry(14, 1, 2026, 60),
        makeEntry(14, 1, 2026, 30),
        makeEntry(15, 1, 2026, 45),
      ];
      const result = buildTrendData(data, 'day');
      expect(result).toHaveLength(2);
    });

    it('sums hours correctly within a day bucket (60 + 30 = 1.5 hours)', () => {
      const data = [
        makeEntry(14, 1, 2026, 60),
        makeEntry(14, 1, 2026, 30),
      ];
      const result = buildTrendData(data, 'day');
      expect(result).toHaveLength(1);
      expect(result[0].hours).toBeCloseTo(1.5, 5);
    });

    it('creates separate buckets for different days', () => {
      const data = [
        makeEntry(10, 1, 2026, 60),
        makeEntry(11, 1, 2026, 60),
        makeEntry(12, 1, 2026, 60),
      ];
      const result = buildTrendData(data, 'day');
      expect(result).toHaveLength(3);
    });

    it('each bucket has a name and hours property', () => {
      const data = [makeEntry(14, 1, 2026, 120)];
      const result = buildTrendData(data, 'day');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('hours');
      expect(result[0].hours).toBeCloseTo(2.0, 5);
    });
  });

  describe('week timeframe', () => {
    it('groups entries from the same ISO week into one bucket', () => {
      // Jan 12-16, 2026 are all in the same ISO week (week 3)
      const data = [
        makeEntry(12, 1, 2026, 60),
        makeEntry(13, 1, 2026, 60),
        makeEntry(14, 1, 2026, 60),
      ];
      const result = buildTrendData(data, 'week');
      expect(result).toHaveLength(1);
    });

    it('creates separate buckets for different weeks', () => {
      // Jan 5 (week 2) and Jan 12 (week 3) are in different weeks
      const data = [
        makeEntry(5, 1, 2026, 60),
        makeEntry(12, 1, 2026, 60),
      ];
      const result = buildTrendData(data, 'week');
      expect(result).toHaveLength(2);
    });

    it('bucket name starts with W for week entries', () => {
      const data = [makeEntry(14, 1, 2026, 60)];
      const result = buildTrendData(data, 'week');
      expect(result[0].name).toMatch(/^W\d+$/);
    });

    it('sums hours correctly across multiple entries in same week', () => {
      // 3 entries x 60 min each = 3 hours total
      const data = [
        makeEntry(12, 1, 2026, 60),
        makeEntry(13, 1, 2026, 60),
        makeEntry(14, 1, 2026, 60),
      ];
      const result = buildTrendData(data, 'week');
      expect(result[0].hours).toBeCloseTo(3.0, 5);
    });
  });

  describe('month timeframe', () => {
    it('groups entries from the same month into one bucket', () => {
      const data = [
        makeEntry(5, 1, 2026, 60),
        makeEntry(15, 1, 2026, 60),
        makeEntry(25, 1, 2026, 60),
      ];
      const result = buildTrendData(data, 'month');
      expect(result).toHaveLength(1);
    });

    it('creates separate buckets for different months', () => {
      const data = [
        makeEntry(14, 1, 2026, 60),
        makeEntry(14, 2, 2026, 60),
        makeEntry(14, 3, 2026, 60),
      ];
      const result = buildTrendData(data, 'month');
      expect(result).toHaveLength(3);
    });

    it('sums hours correctly across multiple months', () => {
      // Jan: 60+60=120 min = 2 hours, Feb: 60 min = 1 hour
      const data = [
        makeEntry(5, 1, 2026, 60),
        makeEntry(15, 1, 2026, 60),
        makeEntry(14, 2, 2026, 60),
      ];
      const result = buildTrendData(data, 'month');
      expect(result).toHaveLength(2);
      // Find Jan bucket
      const janBucket = result.find(r => r.name.toLowerCase().includes('jan'));
      expect(janBucket).toBeDefined();
      expect(janBucket.hours).toBeCloseTo(2.0, 5);
    });
  });

  describe('chronological ordering', () => {
    it('preserves chronological order when input data is sorted', () => {
      // parseCSV returns sorted data; buildTrendData preserves insertion order
      const data = [
        makeEntry(10, 1, 2026, 60),
        makeEntry(20, 1, 2026, 60),
        makeEntry(14, 2, 2026, 60),
      ];
      const result = buildTrendData(data, 'month');
      // Jan should come before Feb
      const names = result.map(r => r.name);
      const janIdx = names.findIndex(n => n.toLowerCase().includes('jan'));
      const febIdx = names.findIndex(n => n.toLowerCase().includes('feb'));
      expect(janIdx).toBeLessThan(febIdx);
    });
  });

  describe('edge cases', () => {
    it('skips entries with null dateObj', () => {
      const data = [
        { dateStr: 'invalid', dateObj: null, minutes: 60 },
        makeEntry(14, 1, 2026, 60),
      ];
      const result = buildTrendData(data, 'day');
      // Only the valid entry should be bucketed
      expect(result).toHaveLength(1);
    });

    it('converts minutes to hours (divides by 60)', () => {
      const data = [makeEntry(14, 1, 2026, 150)]; // 150 min = 2.5 hours
      const result = buildTrendData(data, 'day');
      expect(result[0].hours).toBeCloseTo(2.5, 5);
    });
  });
});
