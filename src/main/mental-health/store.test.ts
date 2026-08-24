import { beforeEach, describe, expect, it } from 'vitest';
import { MentalHealthStore } from './store';
import { InMemoryStorage } from './storage';
import { ValidationError } from './validation';
import { MENTAL_HEALTH_SCHEMA_VERSION, type SelfCheckDefinition } from './types';

const definition: SelfCheckDefinition = {
  id: 'strain-check',
  version: 1,
  title: 'Belastungs-Check',
  questions: [{ id: 'q1', text: 'Ich fühle mich ausgelaugt.', min: 1, max: 5 }],
  bands: [{ id: 'low', label: 'Unauffällig', minScore: 1, maxScore: 3 }]
};

/** Deterministic ids and a fixed clock keep assertions readable. */
function openStore(storage = new InMemoryStorage()) {
  let counter = 0;
  return MentalHealthStore.open({
    storage,
    definitions: [definition],
    now: () => new Date('2026-08-24T09:30:00Z'),
    createId: () => `id-${++counter}`
  });
}

describe('MentalHealthStore', () => {
  let storage: InMemoryStorage;
  let store: MentalHealthStore;

  beforeEach(async () => {
    storage = new InMemoryStorage();
    store = await openStore(storage);
  });

  it('starts empty when nothing was persisted before', () => {
    expect(store.listMoodEntries()).toEqual([]);
    expect(store.listJournalEntries()).toEqual([]);
    expect(store.listSelfCheckResponses()).toEqual([]);
  });

  it('persists a mood entry before resolving', async () => {
    await store.addMoodEntry({ mood: 4 });

    const persisted = await storage.read();
    expect(persisted?.schemaVersion).toBe(MENTAL_HEALTH_SCHEMA_VERSION);
    expect(persisted?.moodEntries).toHaveLength(1);
  });

  it('reloads persisted entries into a fresh store', async () => {
    await store.addMoodEntry({ mood: 4, recordedAt: '2026-08-22T12:00:00Z' });

    const reopened = await openStore(storage);
    expect(reopened.listMoodEntries().map((e) => e.mood)).toEqual([4]);
  });

  it('lists mood entries newest first', async () => {
    await store.addMoodEntry({ mood: 1, recordedAt: '2026-08-20T12:00:00Z' });
    await store.addMoodEntry({ mood: 5, recordedAt: '2026-08-23T12:00:00Z' });

    expect(store.listMoodEntries().map((e) => e.mood)).toEqual([5, 1]);
  });

  it('filters by an inclusive day range', async () => {
    await store.addMoodEntry({ mood: 1, recordedAt: '2026-08-19T12:00:00Z' });
    await store.addMoodEntry({ mood: 3, recordedAt: '2026-08-20T12:00:00Z' });
    await store.addMoodEntry({ mood: 5, recordedAt: '2026-08-22T12:00:00Z' });

    const range = { from: '2026-08-20', to: '2026-08-22' };
    expect(store.listMoodEntries(range).map((e) => e.mood)).toEqual([5, 3]);
  });

  it('rejects a malformed day range', () => {
    expect(() => store.listMoodEntries({ from: '20.08.2026' })).toThrow(ValidationError);
  });

  it('reports one averaged mood per day for the calendar', async () => {
    await store.addMoodEntry({ mood: 2, recordedAt: '2026-08-22T08:00:00Z' });
    await store.addMoodEntry({ mood: 4, recordedAt: '2026-08-22T20:00:00Z' });

    expect(store.moodByDay()).toEqual([{ day: '2026-08-22', mood: 3, entryCount: 2 }]);
  });

  it('clears the link but keeps the journal text when a linked mood entry is deleted', async () => {
    const mood = await store.addMoodEntry({ mood: 3 });
    await store.addJournalEntry({ body: 'Gedanken zum Tag.', moodEntryId: mood.id });

    expect(await store.deleteMoodEntry(mood.id)).toBe(true);

    const [journal] = store.listJournalEntries();
    expect(journal?.body).toBe('Gedanken zum Tag.');
    expect(journal).not.toHaveProperty('moodEntryId');
  });

  it('reports a miss instead of throwing when deleting an unknown mood entry', async () => {
    expect(await store.deleteMoodEntry('nope')).toBe(false);
  });

  it('refuses to link a journal entry to a mood entry that does not exist', async () => {
    await expect(store.addJournalEntry({ body: 'Text.', moodEntryId: 'nope' })).rejects.toThrow(
      ValidationError
    );
    expect(store.listJournalEntries()).toEqual([]);
  });

  it('updates a journal entry and persists the change', async () => {
    const entry = await store.addJournalEntry({ body: 'Erste Fassung.' });
    await store.updateJournalEntry(entry.id, { body: 'Zweite Fassung.' });

    const persisted = await storage.read();
    expect(persisted?.journalEntries[0]?.body).toBe('Zweite Fassung.');
  });

  it('rejects an update to an unknown journal entry', async () => {
    await expect(store.updateJournalEntry('nope', { body: 'x' })).rejects.toThrow(ValidationError);
  });

  it('scores and stores a submitted self-check', async () => {
    const response = await store.submitSelfCheck({ definitionId: 'strain-check', answers: { q1: 2 } });

    expect(response.score).toBe(2);
    expect(response.bandId).toBe('low');
    expect(store.listSelfCheckResponses()).toHaveLength(1);
  });

  it('rejects a self-check that is not registered', async () => {
    await expect(store.submitSelfCheck({ definitionId: 'nope', answers: {} })).rejects.toThrow(
      ValidationError
    );
  });

  it('ships no questionnaire by default', async () => {
    const bare = await MentalHealthStore.open();

    expect(bare.listSelfCheckDefinitions()).toEqual([]);
  });

  it('exports a copy that callers cannot use to mutate stored data', async () => {
    await store.addMoodEntry({ mood: 4 });

    const exported = store.exportSnapshot();
    exported.moodEntries[0]!.mood = 1;

    expect(store.listMoodEntries()[0]?.mood).toBe(4);
  });
});
