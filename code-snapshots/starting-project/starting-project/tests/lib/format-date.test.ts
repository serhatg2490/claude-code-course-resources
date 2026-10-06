import { describe, expect, it } from 'vitest';

import { formatSqliteDate, parseSqliteDate } from '@/lib/format-date';

describe('parseSqliteDate', () => {
  it('interprets SQLite datetime strings as UTC', () => {
    expect(parseSqliteDate('2026-01-15 09:30:00').toISOString()).toBe('2026-01-15T09:30:00.000Z');
  });
});

describe('formatSqliteDate', () => {
  it('returns an ISO string and a UTC label', () => {
    expect(formatSqliteDate('2026-01-15 09:30:00')).toEqual({
      iso: '2026-01-15T09:30:00.000Z',
      label: 'Jan 15, 2026, 9:30 AM UTC',
    });
  });
});
