import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonFileStorage } from './json-file-storage';
import { emptySnapshot, MENTAL_HEALTH_SCHEMA_VERSION } from './types';

describe('JsonFileStorage', () => {
  let directory: string;
  let filePath: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'mindfield-'));
    filePath = path.join(directory, 'nested', 'mental-health.json');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('reports no data before the first write', async () => {
    expect(await new JsonFileStorage(filePath).read()).toBeNull();
  });

  it('creates missing directories and round-trips a snapshot', async () => {
    const storage = new JsonFileStorage(filePath);
    const snapshot = emptySnapshot();
    snapshot.moodEntries.push({
      id: 'id-1',
      day: '2026-08-24',
      recordedAt: '2026-08-24T09:30:00.000Z',
      mood: 4
    });

    await storage.write(snapshot);

    expect(await storage.read()).toEqual(snapshot);
  });

  it('leaves no temporary file behind', async () => {
    const storage = new JsonFileStorage(filePath);
    await storage.write(emptySnapshot());

    const files = await readdir(path.dirname(filePath));
    expect(files.filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('keeps every entry when writes are issued concurrently', async () => {
    const storage = new JsonFileStorage(filePath);
    const first = emptySnapshot();
    const second = emptySnapshot();
    second.journalEntries.push({
      id: 'id-1',
      day: '2026-08-24',
      createdAt: '2026-08-24T09:30:00.000Z',
      updatedAt: '2026-08-24T09:30:00.000Z',
      body: 'Text.'
    });

    await Promise.all([storage.write(first), storage.write(second)]);

    expect((await storage.read())?.journalEntries).toHaveLength(1);
  });

  it('treats an empty file as no data rather than failing', async () => {
    const flat = path.join(directory, 'mental-health.json');
    await writeFile(flat, '   ', 'utf8');

    expect(await new JsonFileStorage(flat).read()).toBeNull();
  });

  it('fails loudly on a corrupt file instead of silently dropping entries', async () => {
    const flat = path.join(directory, 'mental-health.json');
    await writeFile(flat, '{ not json', 'utf8');

    await expect(new JsonFileStorage(flat).read()).rejects.toThrow(/not valid JSON/);
  });

  it('fills in collections missing from a hand-edited file', async () => {
    const flat = path.join(directory, 'mental-health.json');
    await writeFile(flat, JSON.stringify({ schemaVersion: 1 }), 'utf8');

    expect(await new JsonFileStorage(flat).read()).toEqual(emptySnapshot());
  });

  it('fails loudly when a present collection has the wrong type, instead of dropping it', async () => {
    const flat = path.join(directory, 'mental-health.json');
    await writeFile(flat, JSON.stringify({ ...emptySnapshot(), moodEntries: null }), 'utf8');

    await expect(new JsonFileStorage(flat).read()).rejects.toThrow(/moodEntries.*not a list/);
  });

  it('refuses data written by a newer schema version', async () => {
    const flat = path.join(directory, 'mental-health.json');
    await writeFile(
      flat,
      JSON.stringify({ ...emptySnapshot(), schemaVersion: MENTAL_HEALTH_SCHEMA_VERSION + 1 }),
      'utf8'
    );

    await expect(new JsonFileStorage(flat).read()).rejects.toThrow(/newer version/);
  });

  it('writes readable, diff-friendly JSON', async () => {
    await new JsonFileStorage(filePath).write(emptySnapshot());

    const contents = await readFile(filePath, 'utf8');
    expect(contents).toMatch(/\n {2}"moodEntries": \[\]/);
    expect(contents.endsWith('\n')).toBe(true);
  });
});
