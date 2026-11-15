import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

const row = (job: string, lastStatus: 'ok' | 'retry' | 'fail') => ({
  job, owner: null, runs: 1, retries: 0, lastStatus, lastError: null,
  firstAt: '2026-10-28T01:00:00+01:00', lastAt: '2026-10-28T01:00:00+01:00',
});

const read: ReadNight = (_dir, night) =>
  night === '2026-10-28'
    ? { night, badLines: 0, rows: [row('a', 'ok'), row('b', 'ok'), row('c', 'retry'), row('d', 'fail')] }
    : null;

describe('status board', () => {
  it('shows the lane banner and the nights on disk', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config, read).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('2026-10-28');
  });

  it('links both nights to their digest, with counts for the readable one', async () => {
    const html = await (await createApp(config, read).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('ok 2 · retry 1 · fail 1');
  });

  // The stub reader returns null for 2026-10-27 (the real file is readable); this covers the null path only.
  it('renders — for a night the injected reader returns null for', async () => {
    const html = await (await createApp(config, read).request('/')).text();
    expect(html).toMatch(/2026-10-27<\/a>\s*—/);
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config, read).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
