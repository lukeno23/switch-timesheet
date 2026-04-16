import { describe, it, expect } from 'vitest';
import { mapSupabaseRow } from '../mapSupabaseRow.js';

// Helper to create a full Supabase row with all joins
const makeRow = (overrides = {}) => ({
  id: 'test-uuid-001',
  event_date: '2026-04-15',
  duration_minutes: 120,
  task_details: 'Copywriting for website',
  client_name_raw: 'WRH',
  temporal_status: 'completed',
  start_at: '2026-04-15T09:00:00Z',
  end_at: '2026-04-15T11:00:00Z',
  classification_method: 'rule',
  department: 'Brand',
  switcher: { id: 'sw-1', name: 'Luke Azzopardi', primary_dept: 'Brand', is_management_member: true },
  client: { id: 'cl-1', name: 'WRH' },
  category: { id: 'cat-1', name: 'Copywriting', department: 'Brand' },
  ...overrides,
});

describe('mapSupabaseRow', () => {
  it('maps a full row with all joins to correct dashboard-compatible shape', () => {
    const result = mapSupabaseRow(makeRow());

    expect(result.switcher).toBe('Luke Azzopardi');
    expect(result.client).toBe('WRH');
    expect(result.department).toBe('Brand');
    expect(result.task).toBe('Copywriting for website');
    expect(result.minutes).toBe(120);
    expect(result.id).toBe('test-uuid-001');
    expect(result.temporalStatus).toBe('completed');
    expect(result.startAt).toBe('2026-04-15T09:00:00Z');
    expect(result.endAt).toBe('2026-04-15T11:00:00Z');
    expect(result.categoryName).toBe('Copywriting');
    expect(result.classificationMethod).toBe('rule');
    expect(result.switcherId).toBe('sw-1');
    expect(result.clientId).toBe('cl-1');
  });

  it('falls back to client_name_raw when client join is null (Misc event)', () => {
    const result = mapSupabaseRow(makeRow({ client: null }));

    expect(result.client).toBe('WRH');
  });

  it('falls back to row.department when category join is null', () => {
    const result = mapSupabaseRow(makeRow({ category: null }));

    expect(result.department).toBe('Brand');
    expect(result.categoryName).toBe('Misc');
  });

  it('produces non-zero-padded D/M/YYYY dateStr format', () => {
    // April 5 should be "5/4/2026" not "05/04/2026"
    const result = mapSupabaseRow(makeRow({ event_date: '2026-04-05' }));

    expect(result.dateStr).toBe('5/4/2026');
  });

  it('produces a valid Date instance for dateObj', () => {
    const result = mapSupabaseRow(makeRow());

    expect(result.dateObj).toBeInstanceOf(Date);
    expect(result.dateObj.getFullYear()).toBe(2026);
    expect(result.dateObj.getMonth()).toBe(3); // April = month index 3
    expect(result.dateObj.getDate()).toBe(15);
  });

  it('returns "Unknown" for missing switcher name', () => {
    const result = mapSupabaseRow(makeRow({ switcher: null }));

    expect(result.switcher).toBe('Unknown');
    expect(result.switcherId).toBeUndefined();
  });

  it('returns empty string for missing task_details', () => {
    const result = mapSupabaseRow(makeRow({ task_details: null }));

    expect(result.task).toBe('');
  });

  it('returns 0 for missing duration_minutes', () => {
    const result = mapSupabaseRow(makeRow({ duration_minutes: null }));

    expect(result.minutes).toBe(0);
  });
});
