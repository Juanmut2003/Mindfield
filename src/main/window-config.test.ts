import { describe, expect, it } from 'vitest';
import { createWindowOptions } from './window-config';

describe('createWindowOptions', () => {
  it('sets the app title and a sensible minimum window size', () => {
    const options = createWindowOptions();

    expect(options.title).toBe('Mindfield');
    expect(options.minWidth).toBeGreaterThanOrEqual(800);
    expect(options.minHeight).toBeGreaterThanOrEqual(600);
  });

  it('disables Node integration and enables context isolation in the renderer', () => {
    const options = createWindowOptions();

    expect(options.webPreferences?.nodeIntegration).toBe(false);
    expect(options.webPreferences?.contextIsolation).toBe(true);
  });
});
