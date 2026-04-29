// ── Kanji ────────────────────────────────────────────────────────────────────

export const KANJI_RE = /[一-鿿]/;

// ── Data files (relative to project root) ───────────────────────────────────

export const WORDS_FILE = "data/words.txt";
export const SIMILAR_KANJI_FILE = "data/similar-kanji.tsv";
export const GRAPH_OUTPUT = "public/graph.json";

// ── Jitendex dictionary ──────────────────────────────────────────────────────

export const JITENDEX_URL =
  "https://github.com/stephenmk/stephenmk.github.io/releases/latest/download/jitendex-yomitan.zip";

// Path relative to os.homedir() — used when JITENDEX_PATH env var is not set.
export const JITENDEX_CACHE_SUBPATH = ".cache/kanji-graph/jitendex.zip";

// Project-local fallback path, relative to project root.
export const JITENDEX_LOCAL_SUBPATH = "data/dict/jitendex.zip";
