import {
  MENTAL_HEALTH_SCHEMA_VERSION,
  emptySnapshot,
  type MentalHealthSnapshot
} from './types';

/**
 * Persistence seam for mental-health data.
 *
 * Deliberately narrow (read the whole snapshot / write the whole snapshot) so
 * an encrypted-at-rest implementation can be dropped in later without touching
 * the store or the IPC layer — see issue #9 (Datenschutz & sichere
 * Kommunikation). The volume here is a few entries a day, so rewriting the
 * whole file is cheap and keeps the on-disk state consistent.
 */
export interface MentalHealthStorage {
  /** Resolves to `null` when nothing has been persisted yet. */
  read(): Promise<MentalHealthSnapshot | null>;
  write(snapshot: MentalHealthSnapshot): Promise<void>;
}

/** In-memory storage, used by tests and as a fallback when no path is set. */
export class InMemoryStorage implements MentalHealthStorage {
  private snapshot: MentalHealthSnapshot | null;

  constructor(initial: MentalHealthSnapshot | null = null) {
    this.snapshot = initial;
  }

  async read(): Promise<MentalHealthSnapshot | null> {
    return this.snapshot === null ? null : structuredClone(this.snapshot);
  }

  async write(snapshot: MentalHealthSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}

/**
 * Brings an arbitrary parsed value into a usable snapshot shape.
 *
 * A corrupt or hand-edited file must not crash the app on startup, and it must
 * not silently discard data either: unknown future schema versions are
 * rejected loudly, while missing collections just default to empty.
 */
export function normaliseSnapshot(value: unknown): MentalHealthSnapshot {
  if (value === null || typeof value !== 'object') return emptySnapshot();

  const raw = value as Partial<MentalHealthSnapshot>;
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

  if (version > MENTAL_HEALTH_SCHEMA_VERSION) {
    throw new Error(
      `Mental-health data was written by a newer version of Mindfield ` +
        `(schema ${version}, supported ${MENTAL_HEALTH_SCHEMA_VERSION}).`
    );
  }

  return {
    schemaVersion: MENTAL_HEALTH_SCHEMA_VERSION,
    moodEntries: Array.isArray(raw.moodEntries) ? raw.moodEntries : [],
    journalEntries: Array.isArray(raw.journalEntries) ? raw.journalEntries : [],
    selfCheckResponses: Array.isArray(raw.selfCheckResponses) ? raw.selfCheckResponses : []
  };
}
