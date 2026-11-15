import { Hono } from 'hono';
import type { RigConfig } from './config.js';
import { lane } from './lane.js';
import type { ReadNight } from './digest/types.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig, read: ReadNight) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config, read)} />
      </Layout>,
    ),
  );

  return app;
}
