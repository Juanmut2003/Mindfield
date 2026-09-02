import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import { copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createWindowOptions } from './window-config';
import { JsonFileStorage } from './mental-health/json-file-storage';
import { registerMentalHealthIpc } from './mental-health/ipc';
import { MentalHealthStore } from './mental-health/store';
import type { SnapshotCipher } from './mental-health/cipher';

/** Mental-health data lives in the per-user app data folder, never in the repo. */
function mentalHealthDataPath(): string {
  return path.join(app.getPath('userData'), 'mental-health.json');
}

/** Kept beside the data file when it is first encrypted, so nothing is stranded. */
function plaintextBackupPath(): string {
  return `${mentalHealthDataPath()}.plaintext-backup`;
}

/**
 * Encrypts with the key the OS holds for this account — DPAPI on Windows.
 *
 * That choice is what makes encryption free of friction: no passphrase, no
 * prompt at startup. The trade-off is that the data is bound to this account,
 * so a reinstalled Windows or a different machine cannot read it. The athlete
 * is told this once, when their file is first encrypted. A passphrase layer on
 * top remains possible (issue #18) and is not ruled out by this.
 */
function osKeyCipher(): SnapshotCipher | undefined {
  if (!safeStorage.isEncryptionAvailable()) return undefined;
  return {
    encrypt: (plaintext) => safeStorage.encryptString(plaintext).toString('base64'),
    decrypt: (payload) => safeStorage.decryptString(Buffer.from(payload, 'base64'))
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a pre-encryption file in place, once.
 *
 * A copy is kept first: the write itself is atomic, but this is the one moment
 * where a mistake in the new code path could cost the athlete their journal.
 * The copy is plaintext, so the dialog asks them to delete it — leaving it
 * would quietly undo the very thing being switched on.
 */
async function migrateToEncrypted(
  storage: JsonFileStorage,
  store: MentalHealthStore,
  dataPath: string
): Promise<void> {
  const backupPath = plaintextBackupPath();
  if (!(await exists(backupPath))) {
    await copyFile(dataPath, backupPath);
  }

  // exportSnapshot() already hands back a deep clone, so re-writing it needs
  // no new store API — the cipher on the storage does the rest.
  await storage.write(store.exportSnapshot());

  dialog.showMessageBoxSync({
    type: 'info',
    title: 'Deine Einträge sind jetzt verschlüsselt',
    message: 'Deine Stimmungen und Tagebucheinträge werden ab sofort verschlüsselt gespeichert.',
    detail:
      `Andere Benutzer dieses Rechners können die Datei nicht mehr lesen.\n\n` +
      `Wichtig zu wissen: Der Schlüssel liegt in\n${path.join(app.getPath('userData'), 'Local State')}\n` +
      `und ist an dieses Windows-Konto gebunden. Wird dieser Ordner gelöscht, die App ` +
      `restlos deinstalliert oder auf einen anderen Rechner umgezogen, sind die Einträge ` +
      `nicht mehr lesbar. Die Datendatei allein zu sichern reicht also nicht.\n\n` +
      `Eine unverschlüsselte Kopie deines aktuellen Stands liegt hier:\n${backupPath}\n\n` +
      `Prüfe bitte, ob alles vorhanden ist, und lösche sie danach — sonst liegen deine ` +
      `Einträge weiterhin im Klartext auf der Festplatte.`,
    buttons: ['Verstanden']
  });
}

/** Warns rather than silently writing plaintext when the OS offers no key. */
function warnEncryptionUnavailable(dataPath: string): void {
  console.warn('safeStorage reports no encryption available — data stays unencrypted.');
  dialog.showMessageBoxSync({
    type: 'warning',
    title: 'Daten können nicht verschlüsselt werden',
    message: 'Dieses System stellt keinen Schlüssel bereit, deshalb bleiben deine Einträge unverschlüsselt.',
    detail:
      `Die App funktioniert normal weiter, aber die Datei\n${dataPath}\nist im Klartext ` +
      `lesbar. Dich davon auszusperren wäre die schlechtere Lösung — du solltest es aber wissen.`,
    buttons: ['Verstanden']
  });
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
  const cipher = osKeyCipher();
  const storage = new JsonFileStorage(dataPath, { cipher });

  let store: MentalHealthStore;
  try {
    store = await MentalHealthStore.open({ storage });
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

  if (!cipher) {
    warnEncryptionUnavailable(dataPath);
  } else if (storage.needsEncryptionMigration) {
    try {
      await migrateToEncrypted(storage, store, dataPath);
    } catch (error) {
      // The original file is untouched — the atomic write either replaced it
      // wholesale or did nothing. Say so plainly instead of leaving the athlete
      // believing their journal is protected when it is not.
      dialog.showErrorBox(
        'Verschlüsselung fehlgeschlagen',
        `Deine Einträge konnten nicht verschlüsselt werden und liegen weiterhin im ` +
          `Klartext unter\n${dataPath}\n\nEs ist nichts verloren gegangen.\n\n` +
          `Details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
