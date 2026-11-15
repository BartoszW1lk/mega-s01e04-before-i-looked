import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// The issue's "Done when": both nights on disk link to a digest that renders, with the real reader
// on a temp copy of runs/ (read-only fixtures).
describe('board links', () => {
  it('every night on the board links to a digest that answers 200, with its counts beside it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-links-'));
    for (const n of ['2026-10-27', '2026-10-28']) copyFileSync(join('runs', `${n}.jsonl`), join(dir, `${n}.jsonl`));
    const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir };
    const app = createApp(config);
    const html = await (await app.request('/')).text();
    const hrefs = [...html.matchAll(/href="(\/digest\/[^"]+)"/g)].map((m) => m[1] ?? '');
    expect(hrefs).toEqual(['/digest/2026-10-28', '/digest/2026-10-27']);
    for (const href of hrefs) expect({ href, status: (await app.request(href)).status }).toEqual({ href, status: 200 });
    expect(html.match(/ok \d+ · retry \d+ · fail \d+/g)).toHaveLength(2);
  });
});
