import { constants } from 'node:fs';
import { mkdir, rename, writeFile, readFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import type { MentalHealthSnapshot } from './types';
import { normaliseSnapshot, type MentalHealthStorage } from './storage';
import { isEncryptedEnvelope, unwrapEncrypted, wrapEncrypted, type SnapshotCipher } from './cipher';

/** Owner read/write only — mental-health data is not for other local accounts. */
const FILE_MODE = 0o600;

export interface JsonFileStorageOptions {
  /**
   * Encrypts the snapshot before it reaches the disk. Omit it and the file
   * stays readable JSON, which is the pre-encryption behaviour.
   */
  cipher?: SnapshotCipher;
}

/**
 * Stores the snapshot as a single JSON file, optionally encrypted.
 *
 * Writes go to a temporary file first and are then renamed over the target, so
 * a crash mid-write cannot leave a half-written journal behind. Encryption
 * layers on top of that same path rather than in a second class, so the fiddly
 * atomic-write logic exists only once.
 */
export class JsonFileStorage implements MentalHealthStorage {
  private readonly filePath: string;
  private readonly cipher: SnapshotCipher | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private plaintextOnDisk = false;

  constructor(filePath: string, options: JsonFileStorageOptions = {}) {
    this.filePath = filePath;
    this.cipher = options.cipher;
  }

  /**
   * True when the last {@link read} found an unencrypted file while a cipher
   * was configured — i.e. data still waiting to be migrated. Callers use this
   * to trigger a one-off re-write; it stays false when no cipher is in play.
   */
  get needsEncryptionMigration(): boolean {
    return this.plaintextOnDisk && this.cipher !== undefined;
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

    const parsed = this.parse(contents, this.filePath);

    if (!isEncryptedEnvelope(parsed)) {
      // A readable snapshot: either this build has no cipher, or the file
      // predates encryption and wants migrating.
      this.plaintextOnDisk = true;
      return normaliseSnapshot(parsed);
    }

    this.plaintextOnDisk = false;
    if (!this.cipher) {
      throw new Error(
        `Mental-health data at ${this.filePath} is encrypted, but no decryption key is available.`
      );
    }
    return normaliseSnapshot(this.parse(unwrapEncrypted(parsed, this.cipher), 'the decrypted data'));
  }

  private parse(contents: string, source: string): unknown {
    try {
      return JSON.parse(contents);
    } catch (error) {
      throw new Error(`Mental-health data at ${source} is not valid JSON.`, { cause: error });
    }
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
    await writeFile(tempPath, this.serialise(snapshot), {
      encoding: 'utf8',
      mode: FILE_MODE,
      flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC
    });
    await rename(tempPath, this.filePath);
    // Whatever was on disk before, the file now matches the configured cipher.
    this.plaintextOnDisk = this.cipher === undefined;

    // `rename` keeps the temp file's mode on POSIX, but an existing target may
    // predate FILE_MODE, so re-assert it. Best effort: on Windows this is a
    // near no-op and must not fail the write.
    try {
      await chmod(this.filePath, FILE_MODE);
    } catch {
      /* ignore — filesystem does not support POSIX modes */
    }
  }

  /**
   * Plaintext stays pretty-printed so a hand-inspected file is readable; the
   * encrypted envelope is small and machine-only, so it needs no indentation.
   */
  private serialise(snapshot: MentalHealthSnapshot): string {
    const json = JSON.stringify(snapshot, null, 2);
    if (!this.cipher) return `${json}\n`;
    return `${JSON.stringify(wrapEncrypted(json, this.cipher))}\n`;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
