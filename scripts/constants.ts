// ── Kanji ────────────────────────────────────────────────────────────────────

export const KANJI_RE = /[一-鿿]/;

// ── Data files (relative to project root) ───────────────────────────────────

export const WORDS_FILE = "data/words.txt";
export const SIMILAR_KANJI_FILE = "data/similar-kanji.tsv";
export const GRAPH_OUTPUT = "public/graph.json";

// ── Jitendex dictionary ──────────────────────────────────────────────────────

export const JITENDEX_URL =
  "https://github.com/stephenmk/stephenmk.github.io/releases/latest/download/jitendex-yomitan.zip";

// Path relative to os.homedir() — shared across tools; used when JITENDEX_PATH env var is not set.
export const JITENDEX_SHARED_SUBPATH = ".local/share/japanese-dicts/jitendex.zip";

// Project-local fallback path, relative to project root.
export const JITENDEX_LOCAL_SUBPATH = "data/dict/jitendex.zip";

// ── Edge filtering ───────────────────────────────────────────────────────────

// Shared-kanji edges are skipped for any kanji that appears in more than this
// many words. High-frequency kanji (手, 気, 人, ...) generate quadratic edge
// counts that are noise rather than signal. Revisit as the word list grows -
// at 4K words, 50 words/kanji is ~1225 edges per kanji which is already noisy;
// lowering to ~30 would filter the top ~10 kanji and cut edges by ~60%.
export const BRIDGE_KANJI_MAX_WORDS = 50;
