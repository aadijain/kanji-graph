// JmdictFurigana loader. Provides per-character furigana segmentation
// for JMdict entries, keyed by (word, reading). Used by build-graph.ts to split
// shared-kanji edges by whether the bridging kanji is read the same in both
// words. NOT a DictionarySource -- it returns segments, not WordEntry, so it is
// loaded directly in main() rather than chained. Modeled on dict/freq.ts.

import AdmZip from "adm-zip";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { JMDICT_FURIGANA_SHARED_PATH, JMDICT_FURIGANA_LOCAL_SUBPATH } from "../constants.ts";

export interface FuriganaSegment {
  ruby: string; // surface chunk (one kanji, a kanji run, or okurigana kana)
  rt: string; // its reading
}

export interface FuriganaIndex {
  // Returns the rt-bearing segments for a (word, reading) pair, or null if the
  // pair is not in the dataset. Kana-only segments (no rt) are dropped on load.
  lookup(word: string, reading: string): FuriganaSegment[] | null;
}

// JmdictFurigana.json entry shape: kana segments omit the `rt` key entirely.
interface RawSegment {
  ruby: string;
  rt?: string;
}
interface RawEntry {
  text: string;
  reading: string;
  furigana: RawSegment[];
}

const EMPTY_INDEX: FuriganaIndex = { lookup: () => null };

function findFuriganaPath(): string | null {
  const candidates = [
    process.env.JMDICT_FURIGANA_PATH,
    resolve(process.cwd(), JMDICT_FURIGANA_LOCAL_SUBPATH),
    JMDICT_FURIGANA_SHARED_PATH,
  ].filter((p): p is string => !!p);
  return candidates.find((p) => existsSync(p)) ?? null;
}

export async function loadFuriganaIndex(): Promise<FuriganaIndex> {
  const zipPath = findFuriganaPath();
  if (!zipPath) {
    console.warn(
      "[furigana] JmdictFurigana not found. Run `npm run fetch-jmdict-furigana` to download.\n" +
        "  or set JMDICT_FURIGANA_PATH=/path/to/JmdictFurigana.json.zip\n" +
        "  Shared-kanji edges will not be split by reading.",
    );
    return EMPTY_INDEX;
  }

  console.log(`[furigana] reading ${zipPath}`);
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntries().find((e) => /(^|\/)JmdictFurigana\.json$/.test(e.entryName));
  if (!entry) {
    console.warn("[furigana] zip contains no JmdictFurigana.json");
    return EMPTY_INDEX;
  }

  // The JSON file is UTF-8 with a BOM (U+FEFF), which JSON.parse rejects -- strip it.
  let raw = entry.getData().toString("utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const rows = JSON.parse(raw) as RawEntry[];

  const map = new Map<string, FuriganaSegment[]>();
  for (const row of rows) {
    if (!row.text || !row.reading || !Array.isArray(row.furigana)) continue;
    const segs: FuriganaSegment[] = [];
    for (const s of row.furigana) {
      if (typeof s.rt === "string" && s.rt.length > 0) segs.push({ ruby: s.ruby, rt: s.rt });
    }
    map.set(`${row.text}\0${row.reading}`, segs);
  }

  console.log(`[furigana] indexed ${map.size} entries`);
  return {
    lookup: (word, reading) => map.get(`${word}\0${reading}`) ?? null,
  };
}
