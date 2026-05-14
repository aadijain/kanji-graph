import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { JMDICT_FURIGANA_URL, JMDICT_FURIGANA_SHARED_PATH } from "./constants.ts";

const dest = resolve(process.env.JMDICT_FURIGANA_PATH ?? JMDICT_FURIGANA_SHARED_PATH);

const force = process.argv.includes("--force");

if (existsSync(dest) && !force) {
  console.log(`[fetch-jmdict-furigana] already exists: ${dest}`);
  console.log("  Pass --force to re-download.");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });

console.log(`[fetch-jmdict-furigana] downloading → ${dest}`);
const res = await fetch(JMDICT_FURIGANA_URL, { redirect: "follow" });
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

const total = Number(res.headers.get("content-length") ?? 0);
let received = 0;
let lastPct = -1;

const out = createWriteStream(dest);
const body = res.body!;

// Stream with progress
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
console.log("[fetch-jmdict-furigana] saved. Run `npm run build-graph` to rebuild the graph.");
