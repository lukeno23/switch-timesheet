import { describe, it, expect } from 'vitest';
import { buildCacheKey } from '../cacheKey.js';

describe('buildCacheKey', () => {
  it('produces the same key for identical inputs (deterministic)', () => {
    const a = buildCacheKey({ start: '2026-01-01', end: '2026-02-01' }, ['filter1'], 'entity1');
    const b = buildCacheKey({ start: '2026-01-01', end: '2026-02-01' }, ['filter1'], 'entity1');
    expect(a).toBe(b);
  });

  it('produces a different key when dateRange differs', () => {
    const a = buildCacheKey({ start: '2026-01-01', end: '2026-02-01' }, null, null);
    const b = buildCacheKey({ start: '2026-03-01', end: '2026-04-01' }, null, null);
    expect(a).not.toBe(b);
  });

  it('produces a different key when entityId differs', () => {
    const a = buildCacheKey({ start: '2026-01-01', end: '2026-02-01' }, null, 'entity-a');
    const b = buildCacheKey({ start: '2026-01-01', end: '2026-02-01' }, null, 'entity-b');
    expect(a).not.toBe(b);
  });

  it('produces the same key regardless of filter order (sorted)', () => {
    const a = buildCacheKey({ start: 'a', end: 'b' }, ['z', 'a', 'm'], 'e');
    const b = buildCacheKey({ start: 'a', end: 'b' }, ['a', 'm', 'z'], 'e');
    expect(a).toBe(b);
  });

  it('does not throw for null/undefined inputs', () => {
    expect(() => buildCacheKey(null, null, null)).not.toThrow();
    expect(() => buildCacheKey(undefined, undefined, undefined)).not.toThrow();
    expect(() => buildCacheKey({}, [], '')).not.toThrow();
  });

  it('produces a string output', () => {
    const result = buildCacheKey({ start: '2026-01-01', end: '2026-02-01' }, ['f1'], 'e1');
    expect(typeof result).toBe('string');
  });

  it('includes all parts separated by pipe characters', () => {
    const result = buildCacheKey({ start: 'start', end: 'end' }, ['f1', 'f2'], 'eid');
    expect(result).toBe('start|end|f1|f2|eid');
  });
});
