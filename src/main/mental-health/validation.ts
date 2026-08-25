import { RATING_MAX, RATING_MIN, type DayKey, type DayRange } from './types';

/** Thrown when caller-supplied data is rejected before it reaches the store. */
export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a Date as a local-time `YYYY-MM-DD` key. */
export function toDayKey(date: Date): DayKey {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function assertDayKey(value: string, field: string): DayKey {
  if (!DAY_PATTERN.test(value)) {
    throw new ValidationError(field, `${field} must be a YYYY-MM-DD day key`);
  }
  return value;
}

/**
 * Resolves an optional caller-supplied ISO timestamp against the store clock.
 * Returns the parsed Date so callers can derive the day key from the same value.
 *
 * A bare `YYYY-MM-DD` value is treated as that LOCAL calendar date, not UTC
 * midnight: `new Date('2026-08-20')` parses as `2026-08-20T00:00:00Z`, which
 * `toDayKey`'s local-time getters then read back as `2026-08-19` in any
 * timezone behind UTC. Since a date-only backfill carries no time-of-day to
 * preserve, resolving it directly as a local date sidesteps that round-trip.
 */
export function resolveTimestamp(value: string | undefined, now: Date, field: string): Date {
  if (value === undefined) return now;

  if (DAY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    const parsed = new Date(year, month - 1, day);
    if (toDayKey(parsed) !== value) {
      throw new ValidationError(field, `${field} must be a valid calendar date`);
    }
    return parsed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(field, `${field} must be a valid ISO 8601 timestamp`);
  }
  return parsed;
}

/** Validates a whole-number rating on an inclusive [min, max] scale. */
export function assertRating(
  value: unknown,
  field: string,
  min: number = RATING_MIN,
  max: number = RATING_MAX
): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(field, `${field} must be a whole number`);
  }
  if (value < min || value > max) {
    throw new ValidationError(field, `${field} must be between ${min} and ${max}`);
  }
  return value;
}

export function assertOptionalRating(
  value: unknown,
  field: string,
  min?: number,
  max?: number
): number | undefined {
  return value === undefined || value === null ? undefined : assertRating(value, field, min, max);
}

/**
 * Trims free text and rejects empty input. Mental-health notes are personal
 * data, so we store what the user typed and nothing more — no auto-enrichment.
 */
export function assertText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ValidationError(field, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(field, `${field} must not be empty`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(field, `${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/** Like `assertText`, but maps blank input to `undefined` instead of failing. */
export function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError(field, `${field} must be a string`);
  }
  return value.trim().length === 0 ? undefined : assertText(value, field, maxLength);
}

export function optionalTags(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError(field, `${field} must be an array of strings`);
  }

  const tags = value
    .map((tag) => {
      if (typeof tag !== 'string') {
        throw new ValidationError(field, `${field} must be an array of strings`);
      }
      return tag.trim();
    })
    .filter((tag) => tag.length > 0);

  const unique = [...new Set(tags)];
  return unique.length > 0 ? unique : undefined;
}

/** True when `day` falls inside the (inclusive, open-ended) range. */
export function isWithinRange(day: DayKey, range: DayRange | undefined): boolean {
  if (!range) return true;
  if (range.from !== undefined && day < range.from) return false;
  if (range.to !== undefined && day > range.to) return false;
  return true;
}
