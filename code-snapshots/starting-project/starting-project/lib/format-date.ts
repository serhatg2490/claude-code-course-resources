const formatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** SQLite `datetime('now')` yields UTC as `YYYY-MM-DD HH:MM:SS` with no zone marker. */
export function parseSqliteDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function formatSqliteDate(value: string): { iso: string; label: string } {
  const date = parseSqliteDate(value);
  return { iso: date.toISOString(), label: `${formatter.format(date)} UTC` };
}
