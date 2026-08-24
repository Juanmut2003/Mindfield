import { constants } from 'node:fs';
import { mkdir, rename, writeFile, readFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import type { MentalHealthSnapshot } from './types';
import { normaliseSnapshot, type MentalHealthStorage } from './storage';

/** Owner read/write only — mental-health data is not for other local accounts. */
const FILE_MODE = 0o600;

/**
 * Stores the snapshot as a single JSON file.
 *
 * Writes go to a temporary file first and are then renamed over the target, so
 * a crash mid-write cannot leave a half-written journal behind.
 */
export class JsonFileStorage implements MentalHealthStorage {
  private readonly filePath: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async read(): Promise<MentalHealthSnapshot | null> {
    let contents: string;
    try {
      contents = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }

    if (contents.trim().length === 0) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch (error) {
      throw new Error(`Mental-health data at ${this.filePath} is not valid JSON.`, { cause: error });
    }

    return normaliseSnapshot(parsed);
  }

  write(snapshot: MentalHealthSnapshot): Promise<void> {
    // Serialise concurrent writes so two rapid check-ins cannot interleave
    // their temp-file rename and lose one of them.
    const next = this.queue.then(
      () => this.writeNow(snapshot),
      () => this.writeNow(snapshot)
    );
    this.queue = next;
    return next;
  }

  private async writeNow(snapshot: MentalHealthSnapshot): Promise<void> {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });

    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: 'utf8',
      mode: FILE_MODE,
      flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC
    });
    await rename(tempPath, this.filePath);

    // `rename` keeps the temp file's mode on POSIX, but an existing target may
    // predate FILE_MODE, so re-assert it. Best effort: on Windows this is a
    // near no-op and must not fail the write.
    try {
      await chmod(this.filePath, FILE_MODE);
    } catch {
      /* ignore — filesystem does not support POSIX modes */
    }
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
