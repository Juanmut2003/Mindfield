/**
 * Verifies that the built preload is a real, self-contained bundle.
 *
 * The renderer runs sandboxed, so a preload that still contains relative
 * `require()` calls cannot load — and Electron reports that only to the
 * renderer's console. The app then looks perfectly healthy while silently
 * discarding everything the athlete writes. This check turns that into a build
 * failure instead, so a broken bundle never reaches a user.
 *
 * Runs as part of `npm run build:preload`.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RELATIVE_REQUIRE = /\brequire\(\s*["'](\.[^"']*)["']\s*\)/g;

/** The call the preload must make, or it is not exposing the bridge at all. */
const BRIDGE_MARKER = 'exposeInMainWorld';

/**
 * @param {string} source contents of the built preload bundle
 * @returns {string[]} human-readable problems; empty means the bundle is sound
 */
export function findPreloadBundleProblems(source) {
  const problems = [];

  const relativeRequires = [...source.matchAll(RELATIVE_REQUIRE)].map((match) => match[1]);
  if (relativeRequires.length > 0) {
    const unique = [...new Set(relativeRequires)];
    problems.push(
      `still requires ${unique.length} relative module(s) — a sandboxed preload ` +
        `cannot resolve these: ${unique.join(', ')}`
    );
  }

  if (!source.includes(BRIDGE_MARKER)) {
    problems.push(`does not call ${BRIDGE_MARKER}() — window.mindfield would never exist`);
  }

  return problems;
}

async function main() {
  const bundlePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'dist',
    'main',
    'preload.js'
  );

  let source;
  try {
    source = await readFile(bundlePath, 'utf8');
  } catch {
    console.error(`Preload check failed: ${bundlePath} was not built.`);
    process.exit(1);
  }

  const problems = findPreloadBundleProblems(source);
  if (problems.length === 0) return;

  console.error(`Preload check failed for ${bundlePath}:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nThe preload must be bundled with esbuild (npm run build:preload).');
  process.exit(1);
}

// Only run the CLI when invoked directly, so tests can import the check itself.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
