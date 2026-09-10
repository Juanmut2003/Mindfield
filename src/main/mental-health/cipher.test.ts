import { describe, expect, it } from 'vitest';
import {
  ENCRYPTED_FORMAT,
  ENCRYPTED_FORMAT_VERSION,
  isEncryptedEnvelope,
  unwrapEncrypted,
  wrapEncrypted,
  type SnapshotCipher
} from './cipher';

/** Reversible stand-in for safeStorage — the real one needs an Electron process. */
const fakeCipher: SnapshotCipher = {
  encrypt: (plaintext) => Buffer.from(plaintext, 'utf8').toString('base64'),
  decrypt: (payload) => Buffer.from(payload, 'base64').toString('utf8')
};

describe('isEncryptedEnvelope', () => {
  it('recognises an envelope by its format marker', () => {
    expect(isEncryptedEnvelope({ format: ENCRYPTED_FORMAT, version: 1, payload: 'x' })).toBe(true);
  });

  it.each([
    ['a plaintext snapshot', { schemaVersion: 1, moodEntries: [] }],
    ['null', null],
    ['a bare string', 'mindfield-encrypted']
  ])('does not mistake %s for an envelope', (_label, value) => {
    expect(isEncryptedEnvelope(value)).toBe(false);
  });
});

describe('wrapEncrypted / unwrapEncrypted', () => {
  it('round-trips the serialised snapshot', () => {
    const plaintext = JSON.stringify({ schemaVersion: 1, moodEntries: [{ mood: 4 }] });

    const envelope = wrapEncrypted(plaintext, fakeCipher);

    expect(envelope.format).toBe(ENCRYPTED_FORMAT);
    expect(unwrapEncrypted(envelope, fakeCipher)).toBe(plaintext);
  });

  it('keeps the readable text out of the envelope', () => {
    const envelope = wrapEncrypted(JSON.stringify({ body: 'schwerer Tag nach dem Wettkampf' }), fakeCipher);

    expect(JSON.stringify(envelope)).not.toContain('schwerer Tag');
  });

  it('refuses a newer envelope version rather than guessing', () => {
    const envelope = { format: ENCRYPTED_FORMAT, version: ENCRYPTED_FORMAT_VERSION + 1, payload: 'x' } as const;

    expect(() => unwrapEncrypted(envelope, fakeCipher)).toThrow(/newer encryption format/);
  });

  it('rejects an envelope with no payload instead of reporting no data', () => {
    const envelope = { format: ENCRYPTED_FORMAT, version: 1, payload: '' } as const;

    expect(() => unwrapEncrypted(envelope, fakeCipher)).toThrow(/carries no payload/);
  });

  it('explains a failed decryption instead of surfacing a raw crypto error', () => {
    const failing: SnapshotCipher = {
      encrypt: () => 'x',
      decrypt: () => {
        throw new Error('DPAPI: key not found');
      }
    };
    const envelope = wrapEncrypted('anything', failing);

    expect(() => unwrapEncrypted(envelope, failing)).toThrow(/app data folder/);
  });
});
