import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { createWindowOptions } from './window-config';
import { JsonFileStorage } from './mental-health/json-file-storage';
import { registerMentalHealthIpc } from './mental-health/ipc';
import { MentalHealthStore } from './mental-health/store';

/** Mental-health data lives in the per-user app data folder, never in the repo. */
function mentalHealthDataPath(): string {
  return path.join(app.getPath('userData'), 'mental-health.json');
}

/** Shown once per session — a reload would otherwise repeat the dialog. */
let preloadFailureReported = false;

/**
 * A failed preload leaves the renderer without `window.mindfield`: the UI still
 * renders, but nothing can be read or saved. Electron reports this only to the
 * renderer's console, so without this handler the failure is invisible even to
 * a developer running from a terminal.
 *
 * The app deliberately keeps running rather than exiting: the renderer detects
 * the missing bridge too and locks its inputs, which explains the problem in
 * context instead of killing the window the user is looking at.
 */
function reportPreloadFailure(preloadPath: string, error: Error): void {
  console.error(`Preload script failed to load: ${preloadPath}`, error);
  if (preloadFailureReported) return;
  preloadFailureReported = true;

  dialog.showErrorBox(
    'Mindfield kann derzeit nichts speichern',
    'Die Verbindung zwischen Oberfläche und Datenspeicher konnte nicht aufgebaut ' +
      'werden. Deine bereits gespeicherten Daten sind unverändert, aber neue ' +
      'Einträge können nicht gesichert werden.\n\n' +
      `Betroffene Datei:\n${preloadPath}\n\n` +
      `Details: ${error.message}`
  );
}

function createWindow(): void {
  const preloadPath = path.join(app.getAppPath(), 'dist', 'main', 'preload.js');
  const win = new BrowserWindow(createWindowOptions(preloadPath));

  win.webContents.on('preload-error', (_event, failedPath, error) => {
    reportPreloadFailure(failedPath, error);
  });

  win.loadFile(path.join(app.getAppPath(), 'src', 'renderer', 'Homescreen.dc.html'));
}

app.whenReady().then(async () => {
  const dataPath = mentalHealthDataPath();

  let store: MentalHealthStore;
  try {
    store = await MentalHealthStore.open({ storage: new JsonFileStorage(dataPath) });
  } catch (error) {
    // Starting with an empty store would hide the athlete's existing entries and
    // overwrite them on the next check-in, so refuse to start instead.
    dialog.showErrorBox(
      'Mindfield kann die gespeicherten Daten nicht lesen',
      `Die Datei\n${dataPath}\nkonnte nicht geladen werden. Sie wurde nicht verändert.\n\n` +
        `Details: ${error instanceof Error ? error.message : String(error)}`
    );
    app.exit(1);
    return;
  }

  registerMentalHealthIpc(ipcMain, store);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
