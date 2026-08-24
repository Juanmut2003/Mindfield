import type { DayKey, MoodEntry, MoodEntryInput } from './types';
import {
  assertOptionalRating,
  assertRating,
  optionalTags,
  optionalText,
  resolveTimestamp,
  toDayKey
} from './validation';

/** Upper bound for the short remark on a mood entry. */
export const MOOD_NOTE_MAX_LENGTH = 500;

export interface EntryContext {
  id: string;
  now: Date;
}

export function createMoodEntry(input: MoodEntryInput, context: EntryContext): MoodEntry {
  const recordedAt = resolveTimestamp(input.recordedAt, context.now, 'recordedAt');

  const entry: MoodEntry = {
    id: context.id,
    day: toDayKey(recordedAt),
    recordedAt: recordedAt.toISOString(),
    mood: assertRating(input.mood, 'mood')
  };

  const energy = assertOptionalRating(input.energy, 'energy');
  if (energy !== undefined) entry.energy = energy;

  const stress = assertOptionalRating(input.stress, 'stress');
  if (stress !== undefined) entry.stress = stress;

  const note = optionalText(input.note, 'note', MOOD_NOTE_MAX_LENGTH);
  if (note !== undefined) entry.note = note;

  const tags = optionalTags(input.tags, 'tags');
  if (tags !== undefined) entry.tags = tags;

  return entry;
}

/** Newest first — the order the dashboard and journal list want. */
export function sortByRecordedAtDesc(entries: MoodEntry[]): MoodEntry[] {
  return [...entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export interface DailyMood {
  day: DayKey;
  /** Mean mood across all check-ins of that day, rounded to one decimal. */
  mood: number;
  entryCount: number;
}

/**
 * Collapses multiple check-ins per day into one value per day — the shape the
 * calendar screen needs to show "the mood of that day" on a shared timeline.
 * Sorted by day, ascending.
 */
export function averageMoodByDay(entries: MoodEntry[]): DailyMood[] {
  const totals = new Map<DayKey, { sum: number; count: number }>();

  for (const entry of entries) {
    const bucket = totals.get(entry.day) ?? { sum: 0, count: 0 };
    bucket.sum += entry.mood;
    bucket.count += 1;
    totals.set(entry.day, bucket);
  }

  return [...totals.entries()]
    .map(([day, { sum, count }]) => ({
      day,
      mood: Math.round((sum / count) * 10) / 10,
      entryCount: count
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
