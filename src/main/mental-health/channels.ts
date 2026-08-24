/**
 * IPC channel names, shared by the preload bridge and the main-process
 * handlers so the two cannot drift apart.
 */
export const MENTAL_HEALTH_CHANNELS = {
  listMoodEntries: 'mental-health:mood:list',
  addMoodEntry: 'mental-health:mood:add',
  deleteMoodEntry: 'mental-health:mood:delete',
  moodByDay: 'mental-health:mood:by-day',
  listJournalEntries: 'mental-health:journal:list',
  addJournalEntry: 'mental-health:journal:add',
  updateJournalEntry: 'mental-health:journal:update',
  deleteJournalEntry: 'mental-health:journal:delete',
  listSelfCheckDefinitions: 'mental-health:self-check:definitions',
  listSelfCheckResponses: 'mental-health:self-check:responses',
  submitSelfCheck: 'mental-health:self-check:submit',
  exportSnapshot: 'mental-health:export'
} as const;

export type MentalHealthChannel =
  (typeof MENTAL_HEALTH_CHANNELS)[keyof typeof MENTAL_HEALTH_CHANNELS];

/**
 * Every handler answers with this envelope instead of rejecting, so the
 * renderer gets a structured, translatable failure rather than Electron's
 * "Error invoking remote method" string.
 */
export type IpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: IpcError };

export interface IpcError {
  /** `validation` for rejected input, `internal` for anything unexpected. */
  code: 'validation' | 'internal';
  /** Which input field was rejected, when the failure is a validation error. */
  field?: string;
  message: string;
}
