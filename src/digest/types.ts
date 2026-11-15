// Plan morning-digest § 1. The contract section 2 builds against: page, JSON, board link and
// route tests all take a Night from readNight() and never read runs/ themselves.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, once it has parsed.
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset, e.g. 2026-10-29T01:30:00+01:00
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // owner of the latest line; null stays null here, views render it as —
  runs: number; // lines for this job, whatever their status
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that carried one, null if none did
  firstAt: string; // `at` of the earliest line, offset kept as logged
  lastAt: string; // `at` of the latest line, offset kept as logged
};

export type Night = {
  night: string; // YYYY-MM-DD, the file name without .jsonl
  rows: DigestRow[]; // sorted by job; empty for an empty file ("nothing ran")
  badLines: number; // lines that didn't parse or didn't fit RunLine: counted, never thrown
};

// Reads <runsDir>/<night>.jsonl. Returns null when there is no such file (the page's 404).
// Implemented as `export const readNight: ReadNight` in src/digest/read.ts.
export type ReadNight = (runsDir: string, night: string) => Night | null;
