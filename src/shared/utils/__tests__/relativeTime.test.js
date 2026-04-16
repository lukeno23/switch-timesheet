import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatAbsoluteTime } from '../relativeTime.js';

describe('formatRelativeTime', () => {
  it('returns "Never" for null input', () => {
    expect(formatRelativeTime(null)).toBe('Never');
  });

  it('returns "Never" for undefined input', () => {
    expect(formatRelativeTime(undefined)).toBe('Never');
  });

  it('returns "just now" for a time less than 1 minute ago', () => {
    const justNow = new Date(Date.now() - 10 * 1000).toISOString(); // 10 seconds ago
    expect(formatRelativeTime(justNow)).toBe('just now');
  });

  it('returns minutes ago for times between 1-59 minutes', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyMinsAgo)).toBe('30 minutes ago');
  });

  it('returns singular "minute" for exactly 1 minute ago', () => {
    const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000 - 5000).toISOString(); // 1 min 5 sec ago
    expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago');
  });

  it('returns hours ago for times between 1-23 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
  });

  it('returns singular "hour" for exactly 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000 - 60000).toISOString(); // 1h 1m ago
    expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns days ago for times 24+ hours', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
  });

  it('returns singular "day" for exactly 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 60000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
  });
});

describe('formatAbsoluteTime', () => {
  it('returns empty string for null input', () => {
    expect(formatAbsoluteTime(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(formatAbsoluteTime(undefined)).toBe('');
  });

  it('produces a non-empty string with date components', () => {
    const result = formatAbsoluteTime('2026-04-15T14:30:00Z');
    expect(result.length).toBeGreaterThan(0);
    // Should contain month, day, and year
    expect(result).toMatch(/\d/); // Contains digits
    expect(result).toMatch(/Apr|15|2026/); // Contains at least one of these
  });

  it('uses en-GB locale format', () => {
    const result = formatAbsoluteTime('2026-04-15T14:30:00Z');
    // en-GB format should have short month name
    expect(result).toContain('Apr');
    expect(result).toContain('2026');
  });
});
