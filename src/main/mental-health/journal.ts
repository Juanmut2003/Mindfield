import type { JournalEntry, JournalEntryInput, JournalEntryUpdate } from './types';
import type { EntryContext } from './mood';
import { ValidationError, assertText, optionalText, resolveTimestamp, toDayKey } from './validation';

export const JOURNAL_TITLE_MAX_LENGTH = 120;
export const JOURNAL_BODY_MAX_LENGTH = 20_000;

export function createJournalEntry(
  input: JournalEntryInput,
  context: EntryContext
): JournalEntry {
  const createdAt = resolveTimestamp(input.createdAt, context.now, 'createdAt');
  const timestamp = createdAt.toISOString();

  const entry: JournalEntry = {
    id: context.id,
    day: toDayKey(createdAt),
    createdAt: timestamp,
    updatedAt: timestamp,
    body: assertText(input.body, 'body', JOURNAL_BODY_MAX_LENGTH)
  };

  const title = optionalText(input.title, 'title', JOURNAL_TITLE_MAX_LENGTH);
  if (title !== undefined) entry.title = title;

  if (input.moodEntryId !== undefined) {
    entry.moodEntryId = assertText(input.moodEntryId, 'moodEntryId', 100);
  }

  return entry;
}

/**
 * Returns a new entry with the update applied. `day` and `createdAt` stay
 * pinned to the original check-in so editing a reflection later does not move
 * it on the calendar timeline.
 */
export function applyJournalUpdate(
  entry: JournalEntry,
  update: JournalEntryUpdate,
  now: Date
): JournalEntry {
  if (update.body === undefined && update.title === undefined) {
    throw new ValidationError('update', 'update must change the title or the body');
  }

  const updated: JournalEntry = { ...entry, updatedAt: now.toISOString() };

  if (update.body !== undefined) {
    updated.body = assertText(update.body, 'body', JOURNAL_BODY_MAX_LENGTH);
  }

  if (update.title !== undefined) {
    const title = optionalText(update.title, 'title', JOURNAL_TITLE_MAX_LENGTH);
    if (title === undefined) {
      delete updated.title;
    } else {
      updated.title = title;
    }
  }

  return updated;
}

/** Newest first. */
export function sortByCreatedAtDesc(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
