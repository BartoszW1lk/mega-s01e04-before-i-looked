import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import type { ReadNight } from './digest/types.js';
import { startBeating } from './heartbeat.js';
import { lane } from './lane.js';

const config = loadConfig();
// TODO(#1): replace with `import { readNight } from './digest/read.js'` once it exists; until then every count is —.
const readNight: ReadNight = () => null;
const port = Number(process.env.PORT ?? 8787);

startBeating(lane().id, config.beatEverySeconds);
serve({ fetch: createApp(config, readNight).fetch, port }, () => {
  console.log(`rig · ${lane().id} · http://localhost:${port}`);
});
