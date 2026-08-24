import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { beforeEach, describe, expect, it } from 'vitest';
import { MENTAL_HEALTH_CHANNELS, type IpcResult } from './channels';
import { registerMentalHealthIpc, unregisterMentalHealthIpc } from './ipc';
import { MentalHealthStore } from './store';

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>;

/** Just enough of Electron's IpcMain to drive the handlers from a unit test. */
class FakeIpcMain {
  readonly handlers = new Map<string, Handler>();

  handle(channel: string, handler: Handler): void {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  async invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`no handler registered for ${channel}`);
    return (await handler({} as IpcMainInvokeEvent, ...args)) as IpcResult<T>;
  }
}

describe('registerMentalHealthIpc', () => {
  let ipc: FakeIpcMain;

  beforeEach(async () => {
    ipc = new FakeIpcMain();
    const store = await MentalHealthStore.open({
      now: () => new Date('2026-08-24T09:30:00Z'),
      createId: () => 'id-1'
    });
    registerMentalHealthIpc(ipc as unknown as IpcMain, store);
  });

  it('registers a handler for every channel', () => {
    for (const channel of Object.values(MENTAL_HEALTH_CHANNELS)) {
      expect(ipc.handlers.has(channel)).toBe(true);
    }
  });

  it('wraps a successful call in an ok envelope', async () => {
    const result = await ipc.invoke(MENTAL_HEALTH_CHANNELS.addMoodEntry, { mood: 4 });

    expect(result).toMatchObject({ ok: true, value: { id: 'id-1', mood: 4 } });
  });

  it('reports rejected input as a structured validation error, not a rejection', async () => {
    const result = await ipc.invoke(MENTAL_HEALTH_CHANNELS.addMoodEntry, { mood: 99 });

    expect(result).toEqual({
      ok: false,
      error: { code: 'validation', field: 'mood', message: expect.stringContaining('between 1 and 5') }
    });
  });

  it('round-trips an entry through add and list', async () => {
    await ipc.invoke(MENTAL_HEALTH_CHANNELS.addMoodEntry, { mood: 2, note: 'müde' });
    const result = await ipc.invoke<{ note?: string }[]>(MENTAL_HEALTH_CHANNELS.listMoodEntries);

    expect(result.ok && result.value.map((entry) => entry.note)).toEqual(['müde']);
  });

  it('removes every handler again on unregister', () => {
    unregisterMentalHealthIpc(ipc as unknown as IpcMain);

    expect(ipc.handlers.size).toBe(0);
  });
});
