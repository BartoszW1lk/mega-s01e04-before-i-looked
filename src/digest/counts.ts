import type { Night, ReadNight } from './types.js';

// ok / retry / fail per night: jobs counted by their last status.
export type NightCounts = { ok: number; retry: number; fail: number };

export function countNight(night: Night): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of night.rows) counts[row.lastStatus] += 1;
  return counts;
}

// null when the night can't be read; views render it as —.
export function countsFor(read: ReadNight, runsDir: string, night: string): NightCounts | null {
  const n = read(runsDir, night);
  return n ? countNight(n) : null;
}
