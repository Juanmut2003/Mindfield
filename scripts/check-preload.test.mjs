import { describe, expect, it } from 'vitest';
import { findPreloadBundleProblems } from './check-preload.mjs';

/** Stand-in for a correctly bundled preload. */
const BUNDLED = 'var x = 1; contextBridge.exposeInMainWorld("mindfield", {});';

describe('findPreloadBundleProblems', () => {
  it('accepts a self-contained bundle', () => {
    expect(findPreloadBundleProblems(BUNDLED)).toEqual([]);
  });

  it('rejects the tsc output that a sandboxed preload cannot load', () => {
    const tscOutput = 'const channels_1 = require("./mental-health/channels");\n' + BUNDLED;

    expect(findPreloadBundleProblems(tscOutput)).toEqual([
      expect.stringContaining('./mental-health/channels')
    ]);
  });

  it('still allows bare package requires, which bundling leaves in place', () => {
    expect(findPreloadBundleProblems('require("electron");\n' + BUNDLED)).toEqual([]);
  });

  it('reports a bundle that never exposes the bridge', () => {
    expect(findPreloadBundleProblems('var x = 1;')).toEqual([
      expect.stringContaining('exposeInMainWorld')
    ]);
  });

  it('lists every distinct unresolvable module once', () => {
    const source = [
      'require("./a");',
      'require("./a");',
      'require("../b");',
      BUNDLED
    ].join('\n');

    const [problem] = findPreloadBundleProblems(source);
    expect(problem).toContain('./a');
    expect(problem).toContain('../b');
    expect(problem).toContain('2 relative module(s)');
  });
});
