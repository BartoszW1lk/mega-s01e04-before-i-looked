import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow, ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

function jobsIn(file: string): string[] {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const jobs: string[] = [];
  for (const l of lines) {
    try {
      jobs.push(JSON.parse(l).job as string);
    } catch {
      // bad lines are skipped, as readNight counts them in badLines
    }
  }
  return [...new Set(jobs)].sort();
}

// Test double: one row per job, sorted by job, built from the read-only fixture.
const readNight: ReadNight = (dir, night) => ({
  night,
  rows: jobsIn(`${dir}/${night}.jsonl`).map((job) => ({ job }) as DigestRow),
  badLines: 0,
});

describe('GET /api/digest/:night', () => {
  it('returns the jobs of the night in the order readNight gave them', async () => {
    const res = await createApp(config, { readNight }).request('/api/digest/2026-10-28');
    const body = (await res.json()) as { rows: { job: string }[] };
    expect(res.status).toBe(200);
    expect(body.rows.map((r) => r.job)).toEqual(jobsIn('runs/2026-10-28.jsonl'));
  });

  it('404s for a night with no file', async () => {
    const app = createApp(config, { readNight: () => null });
    expect((await app.request('/api/digest/2020-01-01')).status).toBe(404);
  });

  it('404s for anything that is not YYYY-MM-DD', async () => {
    const res = await createApp(config, { readNight }).request('/api/digest/..%2Fconfig');
    expect(res.status).toBe(404);
  });
});
