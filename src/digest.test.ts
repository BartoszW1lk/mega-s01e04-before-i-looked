import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import type { Night, ReadNight } from './digest/types.js';

const config = { adapter: 'x', installed: 'x', beatEverySeconds: 60, runsDir: 'unused' };
const row = { job: 'a/b', owner: null, runs: 4, retries: 3, lastStatus: 'ok' as const, lastError: null, firstAt: '2026-10-28T23:00:00+01:00', lastAt: '2026-10-29T01:00:00+01:00' };
const make = (n: Night | null): ReadNight => () => n;

describe('GET /digest/:night', () => {
  it('404 without a file', async () => {
    const res = await createApp(config, make(null)).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });
  it('says nothing ran for an empty night', async () => {
    const res = await createApp(config, make({ night: '2026-10-28', rows: [], badLines: 0 })).request('/digest/2026-10-28');
    expect(await res.text()).toContain('nothing ran');
  });
  it('marks retries >= 3 and renders missing as a dash', async () => {
    const res = await createApp(config, make({ night: '2026-10-28', rows: [row], badLines: 0 })).request('/digest/2026-10-28');
    const html = await res.text();
    expect(html).toContain('class="warn"');
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('+01:00');
  });
  it('marks a fail even with few retries', async () => {
    const failed = { ...row, retries: 0, lastStatus: 'fail' as const };
    const res = await createApp(config, make({ night: '2026-10-28', rows: [failed], badLines: 0 })).request('/digest/2026-10-28');
    expect(await res.text()).toContain('class="warn"');
  });
  it('does not mark a clean row', async () => {
    const res = await createApp(config, make({ night: '2026-10-28', rows: [{ ...row, retries: 0 }], badLines: 0 })).request('/digest/2026-10-28');
    expect(await res.text()).not.toContain('class="warn"');
  });
  it('sorts rows by job', async () => {
    const rows = [{ ...row, job: 'z/last' }, { ...row, job: 'a/first' }];
    const res = await createApp(config, make({ night: '2026-10-28', rows, badLines: 0 })).request('/digest/2026-10-28');
    const html = await res.text();
    expect(html.indexOf('a/first')).toBeLessThan(html.indexOf('z/last'));
  });
  it('404s on a malformed night without calling the reader', async () => {
    let called = false;
    const spy: ReadNight = () => { called = true; return null; };
    const res = await createApp(config, spy).request('/digest/..%2F..%2Fsecret');
    expect(res.status).toBe(404);
    expect(called).toBe(false);
  });
});
