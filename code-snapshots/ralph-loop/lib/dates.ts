/** Date helpers for the notes UI. Client-safe: imports nothing. */

/**
 * Parses a timestamp written by SQLite's `datetime('now')` (`YYYY-MM-DD HH:MM:SS`, always UTC, no zone suffix).
 * Passing it straight to `new Date()` would read it as local time.
 */
export function parseSqliteTimestamp(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Largest unit first: the first one that fits into the elapsed time at least once is used. */
const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: YEAR },
  { unit: 'month', ms: MONTH },
  { unit: 'week', ms: WEEK },
  { unit: 'day', ms: DAY },
  { unit: 'hour', ms: HOUR },
  { unit: 'minute', ms: MINUTE },
];

const relativeTimeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Describes `date` relative to `now` ("just now", "5 minutes ago", "yesterday", "last month").
 * Relative times read the same in every time zone, so server-rendered output is right for every visitor.
 */
export function formatRelativeTime(date: Date, now: Date): string {
  const elapsed = now.getTime() - date.getTime();
  for (const { unit, ms } of UNITS) {
    if (elapsed >= ms) {
      return relativeTimeFormat.format(-Math.floor(elapsed / ms), unit);
    }
  }
  // Under a minute, or slightly in the future because of clock skew.
  return 'just now';
}
