/**
 * Domain types for mental-health tracking (core use case 2).
 *
 * Everything in this folder is deliberately free of Electron runtime imports so
 * it can be unit-tested with Vitest without booting a real Electron process.
 */

/** Lowest / highest value on the shared 1-5 self-rating scale. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Schema version of the persisted snapshot. Bump when the shape changes. */
export const MENTAL_HEALTH_SCHEMA_VERSION = 1;

/** A calendar day in local time, formatted `YYYY-MM-DD`. */
export type DayKey = string;

/**
 * A single mood check-in. Multiple entries per day are allowed (morning /
 * after training / evening); the calendar screen aggregates them per day.
 */
export interface MoodEntry {
  id: string;
  /** Local calendar day this entry belongs to, derived from `recordedAt`. */
  day: DayKey;
  /** Full ISO 8601 timestamp of when the entry was recorded. */
  recordedAt: string;
  /** Overall mood, 1 (very bad) to 5 (very good). */
  mood: number;
  /** Perceived energy, 1-5. Optional — keep the daily check-in low friction. */
  energy?: number;
  /** Perceived stress, 1-5, where 5 means "very stressed". */
  stress?: number;
  /** Short free-text remark. Longer reflections belong in the journal. */
  note?: string;
  /** Free tags, e.g. "Wettkampf", "Verletzung". */
  tags?: string[];
}

/** Free-text journal entry. */
export interface JournalEntry {
  id: string;
  /** Local calendar day this entry belongs to, derived from `createdAt`. */
  day: DayKey;
  createdAt: string;
  updatedAt: string;
  title?: string;
  body: string;
  /** Optional link to the mood entry recorded alongside this journal entry. */
  moodEntryId?: string;
}

/**
 * Self-check questionnaires.
 *
 * The concrete questionnaires are still TBD (see issue #7), so this models the
 * *structure* only and ships no clinical instrument: choosing and licensing a
 * validated questionnaire is a clinical decision, not a technical one.
 */
export interface SelfCheckQuestion {
  id: string;
  text: string;
  min: number;
  max: number;
  /** Labels for the extremes of the answer scale, e.g. "nie" / "täglich". */
  labels?: { min: string; max: string };
  /** When true a high answer is a *good* sign and is inverted before scoring. */
  reverseScored?: boolean;
}

/** A named score range, used to turn a raw score into something readable. */
export interface SelfCheckBand {
  id: string;
  label: string;
  /** Inclusive lower bound. */
  minScore: number;
  /** Inclusive upper bound. */
  maxScore: number;
}

export interface SelfCheckDefinition {
  id: string;
  /** Bumped whenever questions or scoring change, so old responses stay readable. */
  version: number;
  title: string;
  description?: string;
  questions: SelfCheckQuestion[];
  bands: SelfCheckBand[];
}

export interface SelfCheckResponse {
  id: string;
  definitionId: string;
  definitionVersion: number;
  day: DayKey;
  completedAt: string;
  /** Raw answers keyed by question id, before reverse scoring. */
  answers: Record<string, number>;
  score: number;
  /** Band the score falls into, or `null` when no band matches. */
  bandId: string | null;
}

/** Everything the store persists, in one serialisable object. */
export interface MentalHealthSnapshot {
  schemaVersion: number;
  moodEntries: MoodEntry[];
  journalEntries: JournalEntry[];
  selfCheckResponses: SelfCheckResponse[];
}

export function emptySnapshot(): MentalHealthSnapshot {
  return {
    schemaVersion: MENTAL_HEALTH_SCHEMA_VERSION,
    moodEntries: [],
    journalEntries: [],
    selfCheckResponses: []
  };
}

export interface MoodEntryInput {
  mood: number;
  energy?: number;
  stress?: number;
  note?: string;
  tags?: string[];
  /** Defaults to "now". Pass a timestamp to backfill an earlier check-in. */
  recordedAt?: string;
}

export interface JournalEntryInput {
  body: string;
  title?: string;
  moodEntryId?: string;
  /** Defaults to "now". Pass a timestamp to backfill an earlier entry. */
  createdAt?: string;
}

export interface JournalEntryUpdate {
  body?: string;
  title?: string;
}

export interface SelfCheckSubmission {
  definitionId: string;
  answers: Record<string, number>;
  /** Defaults to "now". */
  completedAt?: string;
}

/** Inclusive day range used by the list/query helpers. */
export interface DayRange {
  from?: DayKey;
  to?: DayKey;
}
