import AdmZip from "adm-zip";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { JPDB_FREQ_SHARED_SUBPATH } from "../constants.ts";

// JPDB Yomitan frequency rows come in two shapes:
//   kana terms:  [term, "freq", {value, displayValue}]
//   kanji terms: [term, "freq", {reading, frequency: {value, displayValue}}]
// displayValue with ㋕ suffix marks a kana-form reading rank; entries without it are kanji-form.
type FreqData =
  | { value: number; displayValue?: string }
  | { reading: string; frequency: { value: number; displayValue?: string } };
type FreqRow = [string, "freq", FreqData];

function extractValue(data: FreqData): { value: number; isKanaForm: boolean } | null {
  if ("value" in data && typeof data.value === "number") {
    return { value: data.value, isKanaForm: data.displayValue?.includes("㋕") ?? false };
  }
  if ("frequency" in data && typeof data.frequency?.value === "number") {
    return {
      value: data.frequency.value,
      isKanaForm: data.frequency.displayValue?.includes("㋕") ?? false,
    };
  }
  return null;
}

function findZipPath(): string | null {
  const candidates = [
    process.env.JPDB_FREQ_PATH,
    resolve(homedir(), JPDB_FREQ_SHARED_SUBPATH),
  ].filter((p): p is string => !!p);
  return candidates.find((p) => existsSync(p)) ?? null;
}

export async function loadFrequencyMap(): Promise<Map<string, number>> {
  const zipPath = findZipPath();
  if (!zipPath) {
    console.warn(
      "[freq] JPDB frequency dictionary not found. Run `npm run fetch-freq-dict` to download.\n" +
        "  or set JPDB_FREQ_PATH=/path/to/freq.zip\n" +
        "  Frequency data will be unavailable.",
    );
    return new Map();
  }

  console.log(`[freq] reading ${zipPath}`);
  const zip = new AdmZip(zipPath);
  const banks = zip
    .getEntries()
    .filter((e) => /(^|\/)term_meta_bank_\d+\.json$/.test(e.entryName));
  if (banks.length === 0) {
    console.warn("[freq] zip contains no term_meta_bank_*.json files");
    return new Map();
  }

  // For each term, track: kanji-form rank (preferred) and kana-form rank (fallback).
  // Multiple rows for the same term can exist; keep the lowest rank (= most frequent).
  const kanjiRank = new Map<string, number>();
  const kanaRank = new Map<string, number>();

  for (const bank of banks) {
    const rows = JSON.parse(bank.getData().toString("utf8")) as FreqRow[];
    for (const row of rows) {
      const [term, type, data] = row;
      if (type !== "freq" || !term) continue;
      const parsed = extractValue(data as FreqData);
      if (!parsed) continue;
      const { value, isKanaForm } = parsed;
      const bucket = isKanaForm ? kanaRank : kanjiRank;
      const prev = bucket.get(term);
      if (prev == null || value < prev) bucket.set(term, value);
    }
  }

  // Merge: kanji-form rank takes priority; fall back to kana-form rank.
  const map = new Map<string, number>();
  for (const [term, rank] of kanjiRank) map.set(term, rank);
  for (const [term, rank] of kanaRank) {
    if (!map.has(term)) map.set(term, rank);
  }

  console.log(`[freq] loaded frequency data for ${map.size} terms`);
  return map;
}
