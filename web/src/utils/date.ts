/**
 * Date utilities that avoid timezone-related off-by-one issues.
 *
 * Many of our dates are stored as DATE (YYYY-MM-DD). Creating `new Date('YYYY-MM-DD')`
 * and then calling `toLocaleDateString()` can display the *previous* day in negative
 * timezones. These helpers treat date-only strings as local calendar dates.
 */

export function toDateOnlyString(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  return dateString.split('T')[0] || null;
}

export function parseDateOnlyToLocalDate(dateString: string | null | undefined): Date | null {
  const dateOnly = toDateOnlyString(dateString);
  if (!dateOnly) return null;

  const [y, m, d] = dateOnly.split('-').map((v) => Number(v));
  if (!y || !m || !d) return null;

  // Local midnight for that calendar day
  return new Date(y, m - 1, d);
}

export function formatDateNoTimezone(dateString: string | null | undefined): string {
  const dateOnly = toDateOnlyString(dateString);
  if (!dateOnly) return 'N/A';

  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day) return dateOnly;

  return `${month}/${day}/${year}`;
}

