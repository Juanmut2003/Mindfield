import { describe, expect, it } from 'vitest';
import { createWindowOptions } from './window-config';

const PRELOAD = '/app/dist/main/preload.js';

describe('createWindowOptions', () => {
  it('sets the app title and a sensible minimum window size', () => {
    const options = createWindowOptions(PRELOAD);

    expect(options.title).toBe('Mindfield');
    expect(options.minWidth).toBeGreaterThanOrEqual(800);
    expect(options.minHeight).toBeGreaterThanOrEqual(600);
  });

  it('disables Node integration and enables context isolation in the renderer', () => {
    const options = createWindowOptions(PRELOAD);

    expect(options.webPreferences?.nodeIntegration).toBe(false);
    expect(options.webPreferences?.contextIsolation).toBe(true);
  });

  it('loads the preload bridge that exposes mental-health data to the renderer', () => {
    const options = createWindowOptions(PRELOAD);

    expect(options.webPreferences?.preload).toBe(PRELOAD);
  });
});
