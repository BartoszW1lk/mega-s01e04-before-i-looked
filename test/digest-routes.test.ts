import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

// Plan morning-digest § 2d: the page (2a) and the JSON (2b) through the real reader, on a temp runs dir.
const config = { adapter: 'x', installed: 'x', beatEverySeconds: 60, runsDir: 'unused' };

const good = '{"at":"2026-10-28T23:00:02+01:00","job":"lane/sync","status":"ok","owner":"rook"}';
const retry = '{"at":"2026-10-28T23:10:00+01:00","job":"lane/sync","status":"retry","owner":"rook"}';
const bad = '{"at":"2026-10-28T23:20:00+01:00","job":';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(join(dir, '2026-10-28.jsonl'), `${good}\n${retry}\n`);
  writeFileSync(join(dir, '2026-10-27.jsonl'), '');
  writeFileSync(join(dir, '2026-10-26.jsonl'), `${good}\n${bad}\n`);
  app = createApp({ ...config, runsDir: dir });
});

describe('digest routes with the real reader', () => {
  it('page: 200 and renders the night', async () => {
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('lane/sync');
  });

  it('JSON: 200 and returns the rows', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.night).toBe('2026-10-28');
    expect(night.rows.map((r) => r.job)).toEqual(['lane/sync']);
    expect(night.rows[0].runs).toBe(2);
    expect(night.badLines).toBe(0);
  });

  it('page and JSON: 404 for a night with no file', async () => {
    expect((await app.request('/digest/2020-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2020-01-01')).status).toBe(404);
  });

  it('page: empty night says nothing ran', async () => {
    const res = await app.request('/digest/2026-10-27');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('JSON: empty night returns zero rows, not a 404', async () => {
    const res = await app.request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.rows).toEqual([]);
    expect(night.badLines).toBe(0);
  });

  it('page: a bad line is counted, the good rows still render', async () => {
    const res = await app.request('/digest/2026-10-26');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('lane/sync');
    expect(html).toContain('1 unreadable lines skipped');
  });

  it('JSON: a bad line is counted, the good rows still come back', async () => {
    const res = await app.request('/api/digest/2026-10-26');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual(['lane/sync']);
  });
});
