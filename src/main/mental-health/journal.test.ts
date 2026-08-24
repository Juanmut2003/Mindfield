import { describe, expect, it } from 'vitest';
import { applyJournalUpdate, createJournalEntry } from './journal';
import { ValidationError } from './validation';

const context = { id: 'journal-1', now: new Date('2026-08-24T09:30:00Z') };

describe('createJournalEntry', () => {
  it('sets createdAt and updatedAt to the same timestamp', () => {
    const entry = createJournalEntry({ body: 'Wettkampf lief besser als gedacht.' }, context);

    expect(entry.createdAt).toBe(context.now.toISOString());
    expect(entry.updatedAt).toBe(entry.createdAt);
  });

  it('rejects an empty body', () => {
    expect(() => createJournalEntry({ body: '   ' }, context)).toThrow(ValidationError);
  });

  it('keeps a link to the mood entry it belongs to', () => {
    const entry = createJournalEntry({ body: 'Kurz notiert.', moodEntryId: 'mood-7' }, context);

    expect(entry.moodEntryId).toBe('mood-7');
  });
});

describe('applyJournalUpdate', () => {
  const original = createJournalEntry(
    { body: 'Erste Fassung.', title: 'Nach dem Lauf', createdAt: '2026-08-20T12:00:00Z' },
    context
  );
  const later = new Date('2026-08-24T18:00:00Z');

  it('bumps updatedAt but pins the entry to its original day', () => {
    const updated = applyJournalUpdate(original, { body: 'Zweite Fassung.' }, later);

    expect(updated.body).toBe('Zweite Fassung.');
    expect(updated.updatedAt).toBe(later.toISOString());
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.day).toBe(original.day);
  });

  it('does not mutate the original entry', () => {
    applyJournalUpdate(original, { body: 'Noch eine Fassung.' }, later);

    expect(original.body).toBe('Erste Fassung.');
  });

  it('drops the title when it is cleared', () => {
    const updated = applyJournalUpdate(original, { title: '  ' }, later);

    expect(updated).not.toHaveProperty('title');
  });

  it('rejects an update that changes nothing', () => {
    expect(() => applyJournalUpdate(original, {}, later)).toThrow(ValidationError);
  });
});
