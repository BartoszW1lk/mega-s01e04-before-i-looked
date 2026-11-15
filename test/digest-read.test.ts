import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

// runs/ is read-only: the real night is copied into a temp dir and read from there.
const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
copyFileSync(join('runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight(dir, '2026-10-28');

  it('reads 5 jobs, sorted by job, and counts the 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.night).toBe('2026-10-28');
    expect(night!.badLines).toBe(1);
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('builds each row from its lines, offsets kept as logged', () => {
    expect(night!.rows).toEqual([
      {
        job: 'digest/render',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T05:41:09+01:00',
        lastAt: '2026-10-29T05:41:09+01:00',
      },
      {
        job: 'fixtures/refresh',
        owner: 'rook',
        runs: 4,
        retries: 3,
        lastStatus: 'ok',
        lastError: 'upstream 503',
        firstAt: '2026-10-29T01:30:00+01:00',
        lastAt: '2026-10-29T01:37:00+01:00',
      },
      {
        job: 'lane/sync',
        owner: 'rook',
        runs: 8,
        retries: 1,
        lastStatus: 'ok',
        lastError: 'lock held',
        firstAt: '2026-10-28T23:00:06+01:00',
        lastAt: '2026-10-29T05:00:04+01:00',
      },
      {
        job: 'notes/backup',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'quota exceeded',
        firstAt: '2026-10-29T04:00:01+01:00',
        lastAt: '2026-10-29T04:00:01+01:00',
      },
      {
        job: 'rig/rotate-logs',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:02+01:00',
        lastAt: '2026-10-28T23:00:02+01:00',
      },
    ]);
  });
});

describe('readNight edge cases', () => {
  it('returns null for a night with no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('returns null for a night that is not a date', () => {
    expect(readNight(dir, '../2026-10-28')).toBeNull();
  });

  it('reads an empty file as nothing ran', () => {
    writeFileSync(join(dir, '2026-10-30.jsonl'), '');
    expect(readNight(dir, '2026-10-30')).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });

  it('counts lines that parse but do not fit, never throws', () => {
    writeFileSync(
      join(dir, '2026-10-31.jsonl'),
      [
        '{"at":"2026-10-31T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
        '{"at":"2026-10-31T01:00:00+01:00","job":"a","status":"done","owner":"rook"}',
        '{"at":"2026-10-31T01:00:00+01:00","status":"ok","owner":"rook"}',
        '{"at":"2026-10-31T01:00:00+01:00","job":"a","status":"ok","owner":7}',
        '[1,2]',
        'null',
        'not json',
        '',
      ].join('\r\n'),
    );
    const night = readNight(dir, '2026-10-31');
    expect(night!.badLines).toBe(6);
    expect(night!.rows.map((r) => r.job)).toEqual(['a']);
  });
});
