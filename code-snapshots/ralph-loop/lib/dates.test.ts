import { describe, expect, test } from 'bun:test';
import { formatRelativeTime, parseSqliteTimestamp } from './dates';

describe('parseSqliteTimestamp', () => {
  test('reads the timestamp as UTC', () => {
    expect(parseSqliteTimestamp('2026-10-01 12:34:56').toISOString()).toBe(
      '2026-10-01T12:34:56.000Z',
    );
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  test.each([
    [0, 'just now'],
    [59_000, 'just now'],
    [60_000, '1 minute ago'],
    [5 * 60_000, '5 minutes ago'],
    [59 * 60_000, '59 minutes ago'],
    [60 * 60_000, '1 hour ago'],
    [23 * 60 * 60_000, '23 hours ago'],
    [24 * 60 * 60_000, 'yesterday'],
    [3 * 24 * 60 * 60_000, '3 days ago'],
    [7 * 24 * 60 * 60_000, 'last week'],
    [14 * 24 * 60 * 60_000, '2 weeks ago'],
    [30 * 24 * 60 * 60_000, 'last month'],
    [90 * 24 * 60 * 60_000, '3 months ago'],
    [365 * 24 * 60 * 60_000, 'last year'],
    [800 * 24 * 60 * 60_000, '2 years ago'],
  ])('%p ms ago → %p', (elapsed, expected) => {
    expect(formatRelativeTime(ago(elapsed), now)).toBe(expected);
  });

  test('a timestamp slightly in the future (clock skew) reads as just now', () => {
    expect(formatRelativeTime(new Date(now.getTime() + 5_000), now)).toBe('just now');
  });

  test('works with a parsed SQLite timestamp', () => {
    expect(formatRelativeTime(parseSqliteTimestamp('2026-10-01 10:00:00'), now)).toBe(
      '2 hours ago',
    );
  });
});
