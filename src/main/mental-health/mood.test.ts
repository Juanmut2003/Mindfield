import { describe, expect, it } from 'vitest';
import { averageMoodByDay, createMoodEntry } from './mood';
import { ValidationError } from './validation';
import type { MoodEntry } from './types';

const context = { id: 'entry-1', now: new Date('2026-08-24T09:30:00Z') };

describe('createMoodEntry', () => {
  it('derives the local day and timestamp from the store clock', () => {
    const entry = createMoodEntry({ mood: 4 }, context);

    expect(entry.id).toBe('entry-1');
    expect(entry.recordedAt).toBe(context.now.toISOString());
    expect(entry.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('derives the day from a backfilled timestamp instead of "now"', () => {
    const entry = createMoodEntry({ mood: 3, recordedAt: '2026-08-20T12:00:00Z' }, context);

    expect(entry.day).toBe('2026-08-20');
  });

  it('resolves a bare date backfill to that local calendar day regardless of the machine timezone', () => {
    // A date-only value has no time-of-day to preserve, so it must land on
    // exactly this day everywhere — not shift by one under UTC parsing.
    const entry = createMoodEntry({ mood: 3, recordedAt: '2026-08-20' }, context);

    expect(entry.day).toBe('2026-08-20');
  });

  it('rejects a bare date that is not a real calendar day', () => {
    expect(() => createMoodEntry({ mood: 3, recordedAt: '2026-02-30' }, context)).toThrow(
      ValidationError
    );
  });

  it('keeps optional fields off the entry when they were not supplied', () => {
    const entry = createMoodEntry({ mood: 3 }, context);

    expect(entry).not.toHaveProperty('energy');
    expect(entry).not.toHaveProperty('stress');
    expect(entry).not.toHaveProperty('note');
    expect(entry).not.toHaveProperty('tags');
  });

  it('trims notes and de-duplicates tags', () => {
    const entry = createMoodEntry(
      { mood: 2, note: '  schwerer Tag  ', tags: ['Wettkampf', ' Wettkampf ', '', 'Schlaf'] },
      context
    );

    expect(entry.note).toBe('schwerer Tag');
    expect(entry.tags).toEqual(['Wettkampf', 'Schlaf']);
  });

  it('treats a blank note as no note at all', () => {
    const entry = createMoodEntry({ mood: 5, note: '   ' }, context);

    expect(entry).not.toHaveProperty('note');
  });

  it('treats a null energy/stress the same as an omitted one', () => {
    const entry = createMoodEntry({ mood: 4, energy: null as unknown as number }, context);

    expect(entry).not.toHaveProperty('energy');
  });

  it.each([0, 6, 2.5, '4'])('rejects %o as a mood value', (mood) => {
    expect(() => createMoodEntry({ mood: mood as number }, context)).toThrow(ValidationError);
  });

  it('rejects an unparseable timestamp', () => {
    expect(() => createMoodEntry({ mood: 3, recordedAt: 'gestern' }, context)).toThrow(
      ValidationError
    );
  });
});

describe('averageMoodByDay', () => {
  const entries = [
    { day: '2026-08-22', mood: 2 },
    { day: '2026-08-24', mood: 4 },
    { day: '2026-08-24', mood: 5 },
    { day: '2026-08-24', mood: 4 }
  ] as MoodEntry[];

  it('collapses several check-ins of one day into a single rounded value', () => {
    expect(averageMoodByDay(entries)).toEqual([
      { day: '2026-08-22', mood: 2, entryCount: 1 },
      { day: '2026-08-24', mood: 4.3, entryCount: 3 }
    ]);
  });

  it('returns nothing for an empty history', () => {
    expect(averageMoodByDay([])).toEqual([]);
  });
});
