import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createWindowOptions } from './window-config';

function createWindow(): void {
  const win = new BrowserWindow(createWindowOptions());
  win.loadFile(path.join(app.getAppPath(), 'src', 'renderer', 'Homescreen.dc.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
