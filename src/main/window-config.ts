import type { BrowserWindowConstructorOptions } from 'electron';

export function createWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Mindfield',
    backgroundColor: '#fbfcfe',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  };
}
