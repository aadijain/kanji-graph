import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { JPDB_FREQ_URL, JPDB_FREQ_SHARED_SUBPATH } from "./constants.ts";

const dest = resolve(
  process.env.JPDB_FREQ_PATH ?? resolve(homedir(), JPDB_FREQ_SHARED_SUBPATH)
);

const force = process.argv.includes("--force");

if (existsSync(dest) && !force) {
  console.log(`[fetch-freq-dict] already exists: ${dest}`);
  console.log("  Pass --force to re-download.");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });

console.log(`[fetch-freq-dict] downloading → ${dest}`);
const res = await fetch(JPDB_FREQ_URL, { redirect: "follow" });
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

const total = Number(res.headers.get("content-length") ?? 0);
let received = 0;
let lastPct = -1;

const out = createWriteStream(dest);
const body = res.body!;

const progress = new TransformStream({
  transform(chunk, controller) {
    received += chunk.byteLength;
    if (total > 0) {
      const pct = Math.floor((received / total) * 100);
      if (pct !== lastPct && pct % 10 === 0) {
        process.stdout.write(`\r  ${pct}% (${(received / 1e6).toFixed(1)} MB)`);
        lastPct = pct;
      }
    }
    controller.enqueue(chunk);
  },
});

await pipeline(
  Readable.fromWeb(body.pipeThrough(progress) as any),
  out,
);

process.stdout.write(`\r  done (${(received / 1e6).toFixed(1)} MB)\n`);
console.log("[fetch-freq-dict] saved to", dest);
