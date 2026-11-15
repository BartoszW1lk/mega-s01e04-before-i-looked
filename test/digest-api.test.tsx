import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night, ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

// Deliberately not alphabetical: the route must keep the order readNight gave.
const fixture: Night = {
  night: '2026-10-28',
  badLines: 1,
  rows: [
    { job: 'b-job', owner: null, runs: 3, retries: 2, lastStatus: 'fail', lastError: 'timeout', firstAt: '2026-10-29T01:00:00+01:00', lastAt: '2026-10-29T01:30:00+01:00' },
    { job: 'a-job', owner: 'ola', runs: 1, retries: 0, lastStatus: 'ok', lastError: null, firstAt: '2026-10-29T02:00:00+01:00', lastAt: '2026-10-29T02:00:00+01:00' },
  ],
};

describe('GET /api/digest/:night', () => {
  it('returns the Night from readNight unchanged: full rows, same order', async () => {
    const readNight = vi.fn<ReadNight>(() => fixture);
    const res = await createApp(config, readNight).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fixture);
    expect(readNight).toHaveBeenCalledWith('runs', '2026-10-28');
  });

  it('404s for a night with no file', async () => {
    const app = createApp(config, () => null);
    expect((await app.request('/api/digest/2020-01-01')).status).toBe(404);
  });

  it.each(['abc', '2026-1-28', '2026-10-28x'])('404s for %s without reading', async (name) => {
    const readNight = vi.fn<ReadNight>(() => fixture);
    const res = await createApp(config, readNight).request(`/api/digest/${name}`);
    expect(res.status).toBe(404);
    expect(readNight).not.toHaveBeenCalled();
  });

  it('lists the same jobs in the same order as the page, with the real reader', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-api-'));
    copyFileSync(join('runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));
    const app = createApp({ ...config, runsDir: dir });
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
    const html = await (await app.request('/digest/2026-10-28')).text();
    const pageJobs = [...html.matchAll(/<tr[^>]*><td>(?:! )?([^<]*)<\/td>/g)].map((m) => m[1]);
    expect(json.rows.length).toBeGreaterThan(0);
    expect(pageJobs).toEqual(json.rows.map((r) => r.job));
  });
});
