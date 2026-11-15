import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import type { ReadNight } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

// readNight is injected: its implementation (src/digest/read.ts) is another issue's work.
export function createApp(config: RigConfig = loadConfig(), opts: { readNight?: ReadNight } = {}) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // Same Night from readNight() as the page: rows are passed through, never re-sorted or filtered.
  app.get('/api/digest/:night', (c) => {
    const name = c.req.param('night');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) return c.json({ error: 'no such night' }, 404);
    if (!opts.readNight) return c.json({ error: 'digest not available' }, 503);
    const night = opts.readNight(config.runsDir, name);
    if (!night) return c.json({ error: 'no such night' }, 404);
    return c.json(night);
  });

  return app;
}
