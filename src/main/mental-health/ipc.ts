import type { IpcMain } from 'electron';
import { MENTAL_HEALTH_CHANNELS, type IpcResult } from './channels';
import type { MentalHealthStore } from './store';
import { ValidationError } from './validation';
import type {
  DayRange,
  JournalEntryInput,
  JournalEntryUpdate,
  MoodEntryInput,
  SelfCheckSubmission
} from './types';

/**
 * Wires the store to the renderer. Registered once from the main process; the
 * renderer reaches these through the `window.mindfield.mentalHealth` bridge in
 * `preload.ts`.
 */
export function registerMentalHealthIpc(ipcMain: IpcMain, store: MentalHealthStore): void {
  const { listMoodEntries, addMoodEntry, deleteMoodEntry, moodByDay } = MENTAL_HEALTH_CHANNELS;
  const { listJournalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } =
    MENTAL_HEALTH_CHANNELS;
  const { listSelfCheckDefinitions, listSelfCheckResponses, submitSelfCheck, exportSnapshot } =
    MENTAL_HEALTH_CHANNELS;

  handle(ipcMain, listMoodEntries, (range?: DayRange) => store.listMoodEntries(range));
  handle(ipcMain, addMoodEntry, (input: MoodEntryInput) => store.addMoodEntry(input));
  handle(ipcMain, deleteMoodEntry, (id: string) => store.deleteMoodEntry(id));
  handle(ipcMain, moodByDay, (range?: DayRange) => store.moodByDay(range));

  handle(ipcMain, listJournalEntries, (range?: DayRange) => store.listJournalEntries(range));
  handle(ipcMain, addJournalEntry, (input: JournalEntryInput) => store.addJournalEntry(input));
  handle(ipcMain, updateJournalEntry, (id: string, update: JournalEntryUpdate) =>
    store.updateJournalEntry(id, update)
  );
  handle(ipcMain, deleteJournalEntry, (id: string) => store.deleteJournalEntry(id));

  handle(ipcMain, listSelfCheckDefinitions, () => store.listSelfCheckDefinitions());
  handle(ipcMain, listSelfCheckResponses, (range?: DayRange) => store.listSelfCheckResponses(range));
  handle(ipcMain, submitSelfCheck, (submission: SelfCheckSubmission) =>
    store.submitSelfCheck(submission)
  );
  handle(ipcMain, exportSnapshot, () => store.exportSnapshot());
}

/** Removes every handler again — used when tearing a window/session down. */
export function unregisterMentalHealthIpc(ipcMain: IpcMain): void {
  for (const channel of Object.values(MENTAL_HEALTH_CHANNELS)) {
    ipcMain.removeHandler(channel);
  }
}

function handle<Args extends unknown[], T>(
  ipcMain: IpcMain,
  channel: string,
  run: (...args: Args) => T | Promise<T>
): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]): Promise<IpcResult<T>> => {
    try {
      return { ok: true, value: await run(...(args as Args)) };
    } catch (error) {
      return { ok: false, error: toIpcError(error) };
    }
  });
}

function toIpcError(error: unknown): { code: 'validation' | 'internal'; field?: string; message: string } {
  if (error instanceof ValidationError) {
    return { code: 'validation', field: error.field, message: error.message };
  }
  return {
    code: 'internal',
    message: error instanceof Error ? error.message : 'Unknown error'
  };
}
