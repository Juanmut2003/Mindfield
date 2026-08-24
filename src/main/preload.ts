import { contextBridge, ipcRenderer } from 'electron';
import { MENTAL_HEALTH_CHANNELS, type IpcResult } from './mental-health/channels';
import type {
  DayRange,
  JournalEntry,
  JournalEntryInput,
  JournalEntryUpdate,
  MentalHealthSnapshot,
  MoodEntry,
  MoodEntryInput,
  SelfCheckDefinition,
  SelfCheckResponse,
  SelfCheckSubmission
} from './mental-health/types';
import type { DailyMood } from './mental-health/mood';

/**
 * The surface the renderer sees as `window.mindfield`.
 *
 * Every call resolves to an {@link IpcResult} envelope rather than rejecting,
 * so the UI can render a specific German message for a rejected field instead
 * of a generic failure. Nothing here exposes Node or the filesystem — the
 * renderer stays sandboxed (`contextIsolation`, no `nodeIntegration`).
 */
export interface MentalHealthBridge {
  listMoodEntries(range?: DayRange): Promise<IpcResult<MoodEntry[]>>;
  addMoodEntry(input: MoodEntryInput): Promise<IpcResult<MoodEntry>>;
  deleteMoodEntry(id: string): Promise<IpcResult<boolean>>;
  moodByDay(range?: DayRange): Promise<IpcResult<DailyMood[]>>;

  listJournalEntries(range?: DayRange): Promise<IpcResult<JournalEntry[]>>;
  addJournalEntry(input: JournalEntryInput): Promise<IpcResult<JournalEntry>>;
  updateJournalEntry(id: string, update: JournalEntryUpdate): Promise<IpcResult<JournalEntry>>;
  deleteJournalEntry(id: string): Promise<IpcResult<boolean>>;

  listSelfCheckDefinitions(): Promise<IpcResult<SelfCheckDefinition[]>>;
  listSelfCheckResponses(range?: DayRange): Promise<IpcResult<SelfCheckResponse[]>>;
  submitSelfCheck(submission: SelfCheckSubmission): Promise<IpcResult<SelfCheckResponse>>;

  exportSnapshot(): Promise<IpcResult<MentalHealthSnapshot>>;
}

export interface MindfieldBridge {
  mentalHealth: MentalHealthBridge;
}

const mentalHealth: MentalHealthBridge = {
  listMoodEntries: (range) => invoke(MENTAL_HEALTH_CHANNELS.listMoodEntries, range),
  addMoodEntry: (input) => invoke(MENTAL_HEALTH_CHANNELS.addMoodEntry, input),
  deleteMoodEntry: (id) => invoke(MENTAL_HEALTH_CHANNELS.deleteMoodEntry, id),
  moodByDay: (range) => invoke(MENTAL_HEALTH_CHANNELS.moodByDay, range),

  listJournalEntries: (range) => invoke(MENTAL_HEALTH_CHANNELS.listJournalEntries, range),
  addJournalEntry: (input) => invoke(MENTAL_HEALTH_CHANNELS.addJournalEntry, input),
  updateJournalEntry: (id, update) =>
    invoke(MENTAL_HEALTH_CHANNELS.updateJournalEntry, id, update),
  deleteJournalEntry: (id) => invoke(MENTAL_HEALTH_CHANNELS.deleteJournalEntry, id),

  listSelfCheckDefinitions: () => invoke(MENTAL_HEALTH_CHANNELS.listSelfCheckDefinitions),
  listSelfCheckResponses: (range) => invoke(MENTAL_HEALTH_CHANNELS.listSelfCheckResponses, range),
  submitSelfCheck: (submission) => invoke(MENTAL_HEALTH_CHANNELS.submitSelfCheck, submission),

  exportSnapshot: () => invoke(MENTAL_HEALTH_CHANNELS.exportSnapshot)
};

function invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<T>>;
}

contextBridge.exposeInMainWorld('mindfield', { mentalHealth } satisfies MindfieldBridge);
