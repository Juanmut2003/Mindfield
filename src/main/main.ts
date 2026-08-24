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

function createWindow(): void {
  const preloadPath = path.join(app.getAppPath(), 'dist', 'main', 'preload.js');
  const win = new BrowserWindow(createWindowOptions(preloadPath));
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
