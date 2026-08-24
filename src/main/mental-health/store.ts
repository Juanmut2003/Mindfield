import { randomUUID } from 'node:crypto';
import { averageMoodByDay, createMoodEntry, sortByRecordedAtDesc, type DailyMood } from './mood';
import { applyJournalUpdate, createJournalEntry, sortByCreatedAtDesc } from './journal';
import { assertValidDefinition, createSelfCheckResponse } from './self-check';
import { InMemoryStorage, type MentalHealthStorage } from './storage';
import {
  emptySnapshot,
  type DayRange,
  type JournalEntry,
  type JournalEntryInput,
  type JournalEntryUpdate,
  type MentalHealthSnapshot,
  type MoodEntry,
  type MoodEntryInput,
  type SelfCheckDefinition,
  type SelfCheckResponse,
  type SelfCheckSubmission
} from './types';
import { ValidationError, assertDayKey, isWithinRange } from './validation';

export interface MentalHealthStoreOptions {
  /** Defaults to in-memory storage, which is what the tests use. */
  storage?: MentalHealthStorage;
  /** Available self-check questionnaires. None are bundled yet (issue #7). */
  definitions?: SelfCheckDefinition[];
  /** Injectable clock and id source, so tests get deterministic output. */
  now?: () => Date;
  createId?: () => string;
}

/**
 * Single point of access to all mental-health data.
 *
 * Reads are synchronous against an in-memory snapshot; every mutation persists
 * the whole snapshot before resolving, so a caller that awaits an `add*` call
 * knows the entry survived a crash.
 */
export class MentalHealthStore {
  private readonly storage: MentalHealthStorage;
  private readonly definitions: Map<string, SelfCheckDefinition>;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private snapshot: MentalHealthSnapshot;

  private constructor(snapshot: MentalHealthSnapshot, options: MentalHealthStoreOptions) {
    this.snapshot = snapshot;
    this.storage = options.storage ?? new InMemoryStorage();
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
    this.definitions = new Map(
      (options.definitions ?? []).map((definition) => [
        assertValidDefinition(definition).id,
        definition
      ])
    );
  }

  /** Loads persisted data (if any) and returns a ready-to-use store. */
  static async open(options: MentalHealthStoreOptions = {}): Promise<MentalHealthStore> {
    const storage = options.storage ?? new InMemoryStorage();
    const loaded = await storage.read();
    return new MentalHealthStore(loaded ?? emptySnapshot(), { ...options, storage });
  }

  // --- Mood -----------------------------------------------------------------

  listMoodEntries(range?: DayRange): MoodEntry[] {
    return sortByRecordedAtDesc(filterByDay(this.snapshot.moodEntries, range));
  }

  async addMoodEntry(input: MoodEntryInput): Promise<MoodEntry> {
    const entry = createMoodEntry(input, { id: this.createId(), now: this.now() });
    this.snapshot.moodEntries.push(entry);
    await this.persist();
    return entry;
  }

  async deleteMoodEntry(id: string): Promise<boolean> {
    const index = this.snapshot.moodEntries.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    this.snapshot.moodEntries.splice(index, 1);
    // Journal entries keep their own text; only the dangling link is cleared.
    for (const entry of this.snapshot.journalEntries) {
      if (entry.moodEntryId === id) delete entry.moodEntryId;
    }
    await this.persist();
    return true;
  }

  /** One value per day — what the calendar screen renders on its timeline. */
  moodByDay(range?: DayRange): DailyMood[] {
    return averageMoodByDay(filterByDay(this.snapshot.moodEntries, range));
  }

  // --- Journal --------------------------------------------------------------

  listJournalEntries(range?: DayRange): JournalEntry[] {
    return sortByCreatedAtDesc(filterByDay(this.snapshot.journalEntries, range));
  }

  async addJournalEntry(input: JournalEntryInput): Promise<JournalEntry> {
    if (input.moodEntryId !== undefined) {
      const exists = this.snapshot.moodEntries.some((entry) => entry.id === input.moodEntryId);
      if (!exists) {
        throw new ValidationError('moodEntryId', `no mood entry with id "${input.moodEntryId}"`);
      }
    }

    const entry = createJournalEntry(input, { id: this.createId(), now: this.now() });
    this.snapshot.journalEntries.push(entry);
    await this.persist();
    return entry;
  }

  async updateJournalEntry(id: string, update: JournalEntryUpdate): Promise<JournalEntry> {
    const index = this.snapshot.journalEntries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new ValidationError('id', `no journal entry with id "${id}"`);
    }

    const updated = applyJournalUpdate(this.snapshot.journalEntries[index]!, update, this.now());
    this.snapshot.journalEntries[index] = updated;
    await this.persist();
    return updated;
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    const index = this.snapshot.journalEntries.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    this.snapshot.journalEntries.splice(index, 1);
    await this.persist();
    return true;
  }

  // --- Self-checks ----------------------------------------------------------

  listSelfCheckDefinitions(): SelfCheckDefinition[] {
    return [...this.definitions.values()];
  }

  listSelfCheckResponses(range?: DayRange): SelfCheckResponse[] {
    return filterByDay(this.snapshot.selfCheckResponses, range).sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt)
    );
  }

  async submitSelfCheck(submission: SelfCheckSubmission): Promise<SelfCheckResponse> {
    const definition = this.definitions.get(submission.definitionId);
    if (!definition) {
      throw new ValidationError(
        'definitionId',
        `no self-check definition with id "${submission.definitionId}"`
      );
    }

    const response = createSelfCheckResponse(definition, submission, {
      id: this.createId(),
      now: this.now()
    });
    this.snapshot.selfCheckResponses.push(response);
    await this.persist();
    return response;
  }

  // --- Export ---------------------------------------------------------------

  /**
   * A copy of everything held for the athlete. Backs "export my data" and is
   * what the AI assistant would be handed for pattern analysis — never the
   * live snapshot, so no caller can mutate stored data by accident.
   */
  exportSnapshot(): MentalHealthSnapshot {
    return structuredClone(this.snapshot);
  }

  private async persist(): Promise<void> {
    await this.storage.write(this.snapshot);
  }
}

function filterByDay<T extends { day: string }>(items: T[], range?: DayRange): T[] {
  if (range?.from !== undefined) assertDayKey(range.from, 'range.from');
  if (range?.to !== undefined) assertDayKey(range.to, 'range.to');

  return items.filter((item) => isWithinRange(item.day, range));
}
