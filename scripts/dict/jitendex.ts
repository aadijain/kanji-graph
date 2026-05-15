import AdmZip from "adm-zip";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { DictionarySource, WordEntry } from "./source.ts";
import { JITENDEX_SHARED_PATH, JITENDEX_LOCAL_SUBPATH, MAX_GLOSSES, MIN_ENTRY_SCORE } from "../constants.ts";

// Yomitan term-bank row layout (v3):
// [expression, reading, definitionTags, rules, score, glossary, sequence, termTags]
type TermRow = [string, string, string, string, number, unknown, number, string];

type StructuredNode =
  | string
  | {
      tag?: string;
      text?: string;
      content?: StructuredNode | StructuredNode[];
      type?: string;
      data?: { content?: string; [k: string]: unknown };
    }
  | StructuredNode[];

function findZipPath(): string | null {
  const candidates = [
    process.env.JITENDEX_PATH,
    resolve(process.cwd(), JITENDEX_LOCAL_SUBPATH),
    JITENDEX_SHARED_PATH,
  ].filter((p): p is string => !!p);
  return candidates.find((p) => existsSync(p)) ?? null;
}

// Extract plain text from a node, stripping rt (furigana) and hyperlinks.
function extractPlainText(node: StructuredNode | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractPlainText).join("");
  if (typeof node === "object") {
    if (node.type === "image") return "";
    if (node.tag === "rt") return "";  // furigana — keep only base kanji
    if (node.tag === "a") return "";   // hyperlinks
    if (typeof node.text === "string") return node.text;
    if (node.content !== undefined) return extractPlainText(node.content as StructuredNode);
  }
  return "";
}

// Walk the structured-content tree and collect only glossary list items.
// Whitelist approach: only ul/ol[data.content=glossary] contributes text;
// everything else (POS tags, forms, examples, attribution, xrefs) is skipped.
// Only the first item per glossary block is kept — items within a block are
// synonymous phrasings of the same sense and add visual noise.
function extractGlosses(node: StructuredNode | undefined, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") return;
  if (Array.isArray(node)) { for (const n of node) extractGlosses(n, out); return; }
  if (typeof node === "object") {
    const ct = node.data?.content;
    if (ct === "glossary") {
      const items = Array.isArray(node.content) ? node.content : node.content ? [node.content] : [];
      // Take only the first gloss per sense group.
      const first = items[0];
      if (first) {
        const text = cleanText(extractPlainText(first as StructuredNode));
        if (text) out.push(text);
      }
      return;
    }
    if (node.content !== undefined) extractGlosses(node.content as StructuredNode, out);
  }
}

export function cleanText(s: string): string {
  return s.replace(/​/g, "").replace(/\s+/g, " ").trim();
}

export function jlptFromTags(tags: string): number | undefined {
  // Jitendex / Yomitan tag formats vary: "jlptN5", "jlpt-n5", "jlpt5".
  const m = tags.match(/jlpt[\s-]?n?([1-5])\b/i);
  return m ? Number(m[1]) : undefined;
}

function parseGlossary(glossary: unknown): string[] {
  if (!Array.isArray(glossary)) return [];
  const out: string[] = [];
  for (const item of glossary) {
    if (out.length >= MAX_GLOSSES) break;
    if (typeof item === "string") {
      const text = cleanText(item);
      if (text) out.push(text);
    } else if (item && typeof item === "object") {
      const obj = item as { type?: string; text?: string; content?: unknown };
      if (obj.type === "image") continue;
      if (obj.type === "structured-content") {
        // Whitelist: only pull from glossary list items.
        extractGlosses(obj.content as StructuredNode, out);
      } else if (typeof obj.text === "string") {
        const text = cleanText(obj.text);
        if (text) out.push(text);
      } else {
        const text = cleanText(extractPlainText(obj.content as StructuredNode));
        if (text) out.push(text);
      }
    }
  }
  return out.slice(0, MAX_GLOSSES);
}

// Candidate entry per (expression, sequence) group: tracks the best row seen within a group.
type SeqCandidate = { reading: string; glosses: string[]; jlpt?: number; bestScore: number };

class JitendexSource implements DictionarySource {
  name = "jitendex";
  private byWord = new Map<string, WordEntry[]>();
  private prepared = false;

  async prepare() {
    if (this.prepared) return;
    this.prepared = true;

    const zipPath = findZipPath();
    if (!zipPath) {
      console.warn(
        `[jitendex] dictionary not found. Place the Jitendex .zip at\n` +
          `  ${JITENDEX_SHARED_PATH}  (or set JITENDEX_PATH=/path/to/jitendex.zip)\n` +
          "Download: https://jitendex.org  (or via its GitHub releases).\n" +
          "Continuing with seed dictionary as fallback.",
      );
      return;
    }

    console.log(`[jitendex] reading ${zipPath}`);
    const zip = new AdmZip(zipPath);
    const banks = zip.getEntries().filter((e) => /(^|\/)term_bank_\d+\.json$/.test(e.entryName));
    if (banks.length === 0) {
      console.warn("[jitendex] zip contains no term_bank_*.json files; is this a Yomitan dict?");
      return;
    }

    // Group rows by (expression, sequence). Each sequence = one JMdict dictionary entry.
    // Multiple rows per sequence = different senses of the same entry; we merge their glosses.
    // Across sequences for the same expression, we pick the one with the lowest sequence number
    // (primary/most-fundamental entry), using score as a tiebreaker within a group.
    const bySeq = new Map<string, SeqCandidate>();

    for (const bank of banks) {
      const rows = JSON.parse(bank.getData().toString("utf8")) as TermRow[];
      for (const row of rows) {
        const [expression, reading, , , score, glossary, sequence, termTags] = row;
        if (!expression) continue;
        const numScore = typeof score === "number" ? score : -Infinity;
        const glosses = parseGlossary(glossary);
        if (glosses.length === 0) continue;
        const key = `${expression}\0${sequence}`;
        const existing = bySeq.get(key);
        if (!existing) {
          bySeq.set(key, {
            reading: reading ?? "",
            glosses,
            jlpt: jlptFromTags(typeof termTags === "string" ? termTags : ""),
            bestScore: numScore,
          });
        } else if (numScore > existing.bestScore) {
          // Higher-score row within same entry wins for reading/jlpt; merge glosses.
          existing.reading = reading ?? existing.reading;
          existing.jlpt = jlptFromTags(typeof termTags === "string" ? termTags : "") ?? existing.jlpt;
          existing.bestScore = numScore;
          for (const g of glosses) if (!existing.glosses.includes(g)) existing.glosses.push(g);
        } else {
          // Same entry, lower-score row: just merge any new glosses.
          for (const g of glosses) if (!existing.glosses.includes(g)) existing.glosses.push(g);
        }
      }
    }

    // Collect all sequences per expression, sort best-first.
    // Primary criterion: highest score (reflects JMdict priority tags — news1/ichi1/spec1 etc).
    // Tie-break: most glosses (the richest entry is the primary sense, e.g. ひと over にん for 人).
    // Second tie-break: lowest sequence number.
    // entries[0] is the primary/best entry; all are preserved for multi-entry display.
    const allByExpr = new Map<string, { score: number; glossCount: number; seq: number; key: string }[]>();
    for (const key of bySeq.keys()) {
      const [expression, seqStr] = key.split("\0");
      const seq = parseInt(seqStr, 10);
      const c = bySeq.get(key)!;
      const arr = allByExpr.get(expression) ?? [];
      arr.push({ score: c.bestScore, glossCount: c.glosses.length, seq, key });
      allByExpr.set(expression, arr);
    }

    for (const [expression, candidates] of allByExpr) {
      candidates.sort((a, b) =>
        b.score !== a.score ? b.score - a.score :
        b.glossCount !== a.glossCount ? b.glossCount - a.glossCount :
        a.seq - b.seq
      );
      const filtered = candidates.filter((c, i) => i === 0 || c.score >= MIN_ENTRY_SCORE);
      const entries: WordEntry[] = filtered.map(({ key }) => {
        const c = bySeq.get(key)!;
        return { word: expression, reading: c.reading, glosses: c.glosses.slice(0, MAX_GLOSSES), jlpt: c.jlpt };
      });
      this.byWord.set(expression, entries);
    }
    console.log(`[jitendex] indexed ${this.byWord.size} entries from ${banks.length} term banks`);
  }

  async lookup(word: string) {
    return this.byWord.get(word) ?? null;
  }
}

export const jitendexSource: DictionarySource = new JitendexSource();
