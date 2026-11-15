import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import type { ReadNight } from './digest/types.js';
import { startBeating } from './heartbeat.js';
import { lane } from './lane.js';

const config = loadConfig();
// TODO(#4): src/digest/read.ts is on main (1ca3627), not on this branch. Once main is merged in, drop this
// stub and let createApp default to the real reader. Until then every count on the live board is —.
const readNight: ReadNight = () => null;
const port = Number(process.env.PORT ?? 8787);

startBeating(lane().id, config.beatEverySeconds);
serve({ fetch: createApp(config, readNight).fetch, port }, () => {
  console.log(`rig · ${lane().id} · http://localhost:${port}`);
});
