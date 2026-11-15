import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };
const read: ReadNight = (_dir, night) => ({ night, badLines: 0, rows: [] });

// The issue's "Done when": both nights on disk link to a digest that renders. GET /digest/:night
// is #2's route and is not on this branch yet, so every link is a 404 here and this is expected to
// fail. Once main (#1 read.ts, #2 route) is merged in, drop `.fails`: it must then pass as a plain it().
describe('board links', () => {
  it.fails('every night on the board links to a digest that answers 200', async () => {
    const app = createApp(config, read);
    const html = await (await app.request('/')).text();
    const hrefs = [...html.matchAll(/href="(\/digest\/[^"]+)"/g)].map((m) => m[1] ?? '');
    expect(hrefs).toEqual(['/digest/2026-10-28', '/digest/2026-10-27']);
    for (const href of hrefs) expect({ href, status: (await app.request(href)).status }).toEqual({ href, status: 200 });
  });
});
