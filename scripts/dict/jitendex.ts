import AdmZip from "adm-zip";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { DictionarySource, WordEntry } from "./source.ts";

// Yomitan term-bank row layout (v3):
// [expression, reading, definitionTags, rules, score, glossary, sequence, termTags]
type TermRow = [string, string, string, string, number, unknown, number, string];

type StructuredNode =
  | string
  | { tag?: string; text?: string; content?: StructuredNode | StructuredNode[]; type?: string }
  | StructuredNode[];

function findZipPath(): string | null {
  const candidates = [
    process.env.JITENDEX_PATH,
    resolve(process.cwd(), "data/dict/jitendex.zip"),
    resolve(homedir(), ".cache/kanji-graph/jitendex.zip"),
  ].filter((p): p is string => !!p);
  return candidates.find((p) => existsSync(p)) ?? null;
}

function extractText(node: StructuredNode | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object") {
    if (node.type === "image") return "";
    if (typeof node.text === "string") return node.text;
    if (node.content !== undefined) return extractText(node.content as StructuredNode);
  }
  return "";
}

function cleanText(s: string): string {
  return s.replace(/​/g, "").replace(/\s+/g, " ").trim();
}

function jlptFromTags(tags: string): number | undefined {
  // Jitendex / Yomitan tag formats vary: "jlptN5", "jlpt-n5", "jlpt5".
  const m = tags.match(/jlpt[\s-]?n?([1-5])\b/i);
  return m ? Number(m[1]) : undefined;
}

function parseGlossary(glossary: unknown): string[] {
  if (!Array.isArray(glossary)) return [];
  const out: string[] = [];
  for (const item of glossary) {
    let text: string;
    if (typeof item === "string") {
      text = item;
    } else if (item && typeof item === "object") {
      const obj = item as { type?: string; text?: string; content?: unknown };
      if (obj.type === "image") continue;
      if (typeof obj.text === "string") text = obj.text;
      else text = extractText(obj.content as StructuredNode);
    } else {
      continue;
    }
    text = cleanText(text);
    if (text) out.push(text);
  }
  return out;
}

class JitendexSource implements DictionarySource {
  name = "jitendex";
  private byWord = new Map<string, WordEntry>();
  private prepared = false;

  async prepare() {
    if (this.prepared) return;
    this.prepared = true;

    const zipPath = findZipPath();
    if (!zipPath) {
      console.warn(
        "[jitendex] dictionary not found. Place the Jitendex .zip at\n" +
          "  ~/.cache/kanji-graph/jitendex.zip  (or set JITENDEX_PATH=/path/to/jitendex.zip)\n" +
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

    let total = 0;
    for (const bank of banks) {
      const rows = JSON.parse(bank.getData().toString("utf8")) as TermRow[];
      for (const row of rows) {
        const [expression, reading, , , score, glossary, , termTags] = row;
        if (!expression) continue;
        // First entry per surface form wins. Jitendex orders by sense priority.
        if (this.byWord.has(expression)) continue;
        const glosses = parseGlossary(glossary);
        if (glosses.length === 0) continue;
        this.byWord.set(expression, {
          word: expression,
          reading: reading ?? "",
          glosses,
          frequency: typeof score === "number" ? score : undefined,
          jlpt: jlptFromTags(typeof termTags === "string" ? termTags : ""),
        });
        total++;
      }
    }
    console.log(`[jitendex] indexed ${total} entries from ${banks.length} term banks`);
  }

  async lookup(word: string) {
    return this.byWord.get(word) ?? null;
  }
}

export const jitendexSource: DictionarySource = new JitendexSource();
