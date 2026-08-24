import type { BrowserWindowConstructorOptions } from 'electron';

/**
 * @param preloadPath absolute path to the compiled preload script that exposes
 *   `window.mindfield` to the renderer.
 */
export function createWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Mindfield',
    backgroundColor: '#fbfcfe',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  };
}
