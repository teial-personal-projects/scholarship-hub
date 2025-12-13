import type { ScholarshipResponse } from '@scholarship-hub/shared';

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatAwardRange(
  minAward: unknown,
  maxAward: unknown
): string | null {
  const min = toNumber(minAward);
  const max = toNumber(maxAward);

  if (min == null && max == null) return null;

  const fmt = new Intl.NumberFormat('en-US');
  if (min != null && max != null) {
    if (min === max) return `$${fmt.format(min)}`;
    return `$${fmt.format(min)} - $${fmt.format(max)}`;
  }
  const single = (max ?? min) as number;
  return `$${fmt.format(single)}`;
}

export function formatScholarshipAward(scholarship: ScholarshipResponse): string | null {
  return formatAwardRange(scholarship.min_award, scholarship.max_award);
}

