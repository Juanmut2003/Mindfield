/**
 * Encryption seam for the persisted snapshot.
 *
 * Like everything else below `ipc.ts`, this file must not import Electron at
 * runtime: the actual cipher is injected by the main process (backed by
 * `safeStorage`), so the format logic here stays unit-testable without booting
 * an Electron process.
 */

/** Marks a file as holding ciphertext rather than a readable snapshot. */
export const ENCRYPTED_FORMAT = 'mindfield-encrypted';

/** Bumped only if the envelope itself changes, not the snapshot inside it. */
export const ENCRYPTED_FORMAT_VERSION = 1;

export interface SnapshotCipher {
  /** @param plaintext serialised snapshot @returns base64 ciphertext */
  encrypt(plaintext: string): string;
  /** @param payload base64 ciphertext @returns the serialised snapshot */
  decrypt(payload: string): string;
}

/**
 * What lands on disk when a cipher is configured.
 *
 * Still JSON, so a truncated or hand-mangled file fails with the same "not
 * valid JSON" error as before, and so the plaintext format stays trivially
 * distinguishable from this one.
 */
export interface EncryptedEnvelope {
  format: typeof ENCRYPTED_FORMAT;
  version: number;
  payload: string;
}

/** True when the parsed file holds ciphertext rather than a plain snapshot. */
export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as EncryptedEnvelope).format === ENCRYPTED_FORMAT
  );
}

export function wrapEncrypted(plaintext: string, cipher: SnapshotCipher): EncryptedEnvelope {
  return {
    format: ENCRYPTED_FORMAT,
    version: ENCRYPTED_FORMAT_VERSION,
    payload: cipher.encrypt(plaintext)
  };
}

/**
 * Recovers the serialised snapshot from an envelope.
 *
 * Every failure here throws rather than returning empty: the data is present
 * on disk and merely unreadable, and answering "no entries" would invite the
 * caller to overwrite an intact journal.
 */
export function unwrapEncrypted(envelope: EncryptedEnvelope, cipher: SnapshotCipher): string {
  if (envelope.version > ENCRYPTED_FORMAT_VERSION) {
    throw new Error(
      `Mental-health data uses a newer encryption format (version ${envelope.version}, ` +
        `supported ${ENCRYPTED_FORMAT_VERSION}).`
    );
  }
  if (typeof envelope.payload !== 'string' || envelope.payload.length === 0) {
    throw new Error('Mental-health data is encrypted but carries no payload.');
  }

  try {
    return cipher.decrypt(envelope.payload);
  } catch (error) {
    throw new Error(
      'Mental-health data could not be decrypted. The key belongs to a different ' +
        'user account or app installation — most often because the app data folder ' +
        'was removed or copied from another machine.',
      { cause: error }
    );
  }
}
