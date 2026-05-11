// All tunable values for the client live here. When adding a magic number or
// string anywhere in src/, export it from this file instead so it's one place
// to look when tweaking behavior.

import type { EdgeType } from "../types";

// ── localStorage keys ────────────────────────────────────────────────────────

export const LAYOUT_STORAGE_KEY = "kanji-graph:layout:v1";
export const SETTINGS_STORAGE_KEY = "kanji-graph:settings:v3";
export const SETTINGS_LEGACY_KEY_V2 = "kanji-graph:settings:v2";
export const SETTINGS_LEGACY_KEY = "kanji-graph:settings:v1";

// ── Text / language ──────────────────────────────────────────────────────────

export const KANJI_RE = /[一-鿿]/;
export const FONT_FAMILY = '"Noto Sans JP", "Hiragino Sans", sans-serif';

// ── Audio ────────────────────────────────────────────────────────────────────

// Default URL template for the local Yomitan audio server.
// {term} and {reading} are substituted at query time.
// Override via Settings > Audio > Local audio server URL field.
export const AUDIO_DEFAULT_URL = "http://127.0.0.1:5050/?term={term}&reading={reading}";

// ── Colors ───────────────────────────────────────────────────────────────────

export const NODE_COLORS = {
  default:       "#e8dccd",
  neighbor:      "#f3e7d3",
  focus:         "#ffffff",
  highlight:     "#ffffff",
  muted:         "#5a6078",
  edgeHidden:    "rgba(0, 0, 0, 0)",
  bridgeKanji:   "#d4a857",
  bridgeKanjiHi: "#ffd47a",
  focusRing:     "rgba(255,255,255,0.18)",
  focusShadow:   "rgba(255,255,255,0.4)",
  background:    "#0b0c0f",
};

export const LIGHT_NODE_COLORS = {
  default:       "#212529",
  neighbor:      "#111111",
  focus:         "#000000",
  highlight:     "#000000",
  muted:         "#adb5bd",
  edgeHidden:    "rgba(0, 0, 0, 0)",
  bridgeKanji:   "#b8852e",
  bridgeKanjiHi: "#946216",
  focusRing:     "rgba(0,0,0,0.15)",
  focusShadow:   "rgba(0,0,0,0.25)",
  background:    "#f8f9fa",
};

// Per edge-type metadata. `hex` is the default color; `desc` is the user-facing description.
// Canvas active/muted/ambient variants are computed from the user's chosen color via hexToRgba.
// This is the single source of truth for all edge-type lists -- derive from it, don't duplicate.
export const EDGE_TYPE_META: Record<EdgeType, { label: string; hex: string; desc: string }> = {
  "shared-kanji":      { label: "shared kanji",      hex: "#d4a857", desc: "words share one or more kanji characters" },
  "similar-kanji":     { label: "similar kanji",     hex: "#a880d4", desc: "words contain visually similar or commonly confused kanji" },
  "same-reading":      { label: "same reading",      hex: "#7aa8d9", desc: "words share a kana reading" },
  "alternate-spelling": { label: "alternate spelling", hex: "#d97a82", desc: "same word written with different kanji or kana" },
};

// Typed array of all [EdgeType, meta] pairs. Use instead of Object.entries(EDGE_TYPE_META).
export const EDGE_ENTRIES = Object.entries(EDGE_TYPE_META) as [EdgeType, typeof EDGE_TYPE_META[EdgeType]][];

// Priority order for picking the "primary" type when a word-pair has multiple edges.
// alternate-spelling is excluded: it's a different relationship, not ranked against the others.
export const EDGE_TYPE_PRIORITY: EdgeType[] = ["shared-kanji", "similar-kanji", "same-reading"];

// Curated swatch palette for edge color selection (matches accent.* in tailwind.config.js).
export const EDGE_COLOR_SWATCHES = [
  { label: "gold",  hex: "#d4a857" },
  { label: "rose",  hex: "#d97a82" },
  { label: "sky",   hex: "#7aa8d9" },
  { label: "moss",  hex: "#8fb37a" },
  { label: "plum",  hex: "#a880d4" },
] as const;

// Converts a 6-digit hex color to an rgba() string.
const _rgbaCache = new Map<string, string>();
export function hexToRgba(hex: string, alpha: number): string {
  const key = `${hex}${alpha}`;
  const cached = _rgbaCache.get(key);
  if (cached) return cached;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const result = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  _rgbaCache.set(key, result);
  return result;
}

// ── Storage keys ─────────────────────────────────────────────────────────────

export const SETTINGS_SECTIONS_KEY = "kanji-graph:settings-sections";

// ── Graph renderer ───────────────────────────────────────────────────────────

export const COOLDOWN_TICKS = 300;
export const D3_ALPHA_DECAY = 0.02;
export const D3_VELOCITY_DECAY = 0.3;
export const NODE_REL_SIZE = 4;
export const FOCUS_RING_RADIUS_MULTIPLIER = 2.4;
export const FOCUS_SHADOW_BLUR = 16;
export const RESIZE_FIT_MS = 400;
// Pixel padding passed to zoomToFit() so nodes aren't clipped at the viewport edge.
export const GRAPH_FIT_PADDING = 80;
// Per-edge curvature offset when multiple edge types connect the same word pair.
export const EDGE_CURVATURE_STEP = 0.12;
// Dot radius override for focused and hovered nodes (overrides frequency-based sizing).
export const FOCUS_NODE_RADIUS = 5;
export const FOCUS_HISTORY_MAX = 10;
// Separator color for focus-history items with no direct edge between them.
export const FOCUS_HISTORY_NO_EDGE_COLOR = "#4a4a5a";
// Width of the left back-to-graph strip in focus mode (px).
export const BACK_STRIP_WIDTH = 80;
// Left offset for panels that must clear the back strip (strip + 16px gap).
export const BACK_STRIP_PANEL_LEFT = BACK_STRIP_WIDTH + 16;

// ── Focus layout ─────────────────────────────────────────────────────────────

export const FOCUS_LAYOUT_HIGH_N = 14;     // > HIGH_N: split into two concentric rings
export const FOCUS_LAYOUT_RING_MULT = 1.2; // inner at R/MULT, outer at R*MULT
// Blend between original angle (0) and evenly-spaced slot (1). Can be made a
// function of N if needed later.
export const FOCUS_LAYOUT_BLEND = 0.5;

// ── Search ────────────────────────────────────────────────────────────────────

export const SEARCH_MAX_RESULTS = 12;

// ── Frequency dot sizing (JPDB rank → canvas dot radius) ─────────────────────

// Log normalization + power curve spreads the mid-range apart visually.
export const FREQ_DOT_MIN = 1.5;
export const FREQ_DOT_MAX = 11;
export const FREQ_LOG_MAX = 100_000;
