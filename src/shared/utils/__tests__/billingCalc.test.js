import { describe, it, expect } from 'vitest';
import { calcEffectiveRate, calcOverUnderIndicator, formatCurrency, formatRawAmount } from '../billingCalc.js';

describe('calcEffectiveRate', () => {
  it('returns EUR per hour when both inputs are valid', () => {
    expect(calcEffectiveRate(10, 1000)).toBe(100);
  });

  it('returns null when hoursWorked is 0', () => {
    expect(calcEffectiveRate(0, 1000)).toBeNull();
  });

  it('returns null when eurEquivalent is null', () => {
    expect(calcEffectiveRate(10, null)).toBeNull();
  });

  it('returns null when eurEquivalent is 0 (falsy)', () => {
    expect(calcEffectiveRate(10, 0)).toBeNull();
  });

  it('handles fractional hours correctly', () => {
    expect(calcEffectiveRate(2.5, 250)).toBeCloseTo(100, 5);
  });
});

describe('calcOverUnderIndicator', () => {
  it('returns over-serviced when effective rate is below target', () => {
    const result = calcOverUnderIndicator(90, 100);
    expect(result.status).toBe('over-serviced');
    expect(result.delta).toBe(-10);
  });

  it('returns under-serviced when effective rate is above target', () => {
    const result = calcOverUnderIndicator(110, 100);
    expect(result.status).toBe('under-serviced');
    expect(result.delta).toBe(10);
  });

  it('returns on-target when within 5% threshold', () => {
    const result = calcOverUnderIndicator(102, 100);
    expect(result.status).toBe('on-target');
    expect(result.delta).toBe(0);
  });

  it('returns on-target at exactly 5% boundary', () => {
    const result = calcOverUnderIndicator(105, 100);
    expect(result.status).toBe('on-target');
    expect(result.delta).toBe(0);
  });

  it('returns null when effectiveRate is null', () => {
    expect(calcOverUnderIndicator(null, 100)).toBeNull();
  });

  it('returns null when targetRate is null', () => {
    expect(calcOverUnderIndicator(90, null)).toBeNull();
  });

  it('includes a human-readable label', () => {
    const over = calcOverUnderIndicator(80, 100);
    expect(over.label).toContain('vs target');

    const under = calcOverUnderIndicator(120, 100);
    expect(under.label).toContain('+');

    const onTarget = calcOverUnderIndicator(100, 100);
    expect(onTarget.label).toBe('on target');
  });
});

describe('formatCurrency', () => {
  it('formats EUR amount with euro symbol', () => {
    const result = formatCurrency(1000, 'EUR');
    expect(result).toContain('\u20AC'); // Euro sign
    expect(result).toContain('1,000');
  });

  it('formats USD amount with dollar symbol', () => {
    const result = formatCurrency(1000, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('1,000');
  });

  it('defaults to EUR when no currency specified', () => {
    const result = formatCurrency(500);
    expect(result).toContain('\u20AC');
  });

  it('returns -- for null amount', () => {
    expect(formatCurrency(null, 'EUR')).toBe('--');
  });

  it('returns -- for undefined amount', () => {
    expect(formatCurrency(undefined, 'EUR')).toBe('--');
  });
});

describe('formatRawAmount', () => {
  it('formats USD amount with FX rate and EUR equivalent', () => {
    const result = formatRawAmount(10000, 'USD', 0.92, 9200);
    expect(result).toContain('$');
    expect(result).toContain('10,000');
    expect(result).toContain('USD');
    expect(result).toContain('0.92');
    expect(result).toContain('9,200');
  });

  it('returns null for EUR currency (no raw display needed)', () => {
    expect(formatRawAmount(1000, 'EUR', null, 1000)).toBeNull();
  });
});
