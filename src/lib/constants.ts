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

// Canvas cannot read CSS variables, so these hex values must be kept in sync
// with the ink-* and accent-* custom properties in src/index.css manually.
// dark:  background=#0b0c0f(--ink-950)  default=#e8dccd(--accent-paper)  muted=#5a6078(--ink-500)
// light: background=#f8f9fa(--ink-950)  default=#212529(--ink-100)        muted=#adb5bd(--ink-600)
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

// Canvas-side mirror of the --accent-* CSS variables in index.css (dark-mode values).
// Canvas can't read CSS vars, so this map must be kept in sync manually.
export const ACCENT_COLORS = {
  paper: "#e8dccd",
  gold:  "#d4a857",
  rose:  "#d97a82",
  sky:   "#7aa8d9",
  moss:  "#8fb37a",
  plum:  "#a880d4",
} as const;

export type AccentName = keyof typeof ACCENT_COLORS;

// Per edge-type metadata. `color` is the default accent name (resolve to hex via ACCENT_COLORS).
// Canvas active/muted/ambient variants are computed from the user's chosen color via hexToRgba.
// This is the single source of truth for all edge-type lists -- derive from it, don't duplicate.
export const EDGE_TYPE_META: Record<EdgeType, { label: string; color: AccentName; desc: string }> = {
  "shared-kanji":      { label: "shared kanji",      color: "gold", desc: "words share one or more kanji characters; dashed when the shared kanji is read differently in the two words" },
  "similar-kanji":     { label: "similar kanji",     color: "rose", desc: "words contain visually similar or commonly confused kanji" },
  "same-reading":      { label: "same reading",      color: "sky",  desc: "words share a kana reading" },
  "alternate-spelling": { label: "alternate spelling", color: "plum", desc: "same word written with different kanji or kana" },
};

// Typed array of all [EdgeType, meta] pairs. Use instead of Object.entries(EDGE_TYPE_META).
export const EDGE_ENTRIES = Object.entries(EDGE_TYPE_META) as [EdgeType, typeof EDGE_TYPE_META[EdgeType]][];

// Priority order for picking the "primary" type when a word-pair has multiple edges.
// alternate-spelling is excluded: it's a different relationship, not ranked against the others.
export const EDGE_TYPE_PRIORITY: EdgeType[] = ["shared-kanji", "similar-kanji", "same-reading"];

// ── Edge line styles ─────────────────────────────────────────────────────────

// The stroke shape used to draw each edge type, in addition to its color. Helps
// at-a-glance legibility when types overlap and accessibility for color-blind users.
// To re-skin: edit EDGE_STYLE; to tune a style's look: edit EDGE_STYLE_PARAMS.
// Adding another style = a case in drawStyledEdge() and EdgeStyleSwatch, plus an
// EDGE_STYLE_PARAMS entry if it needs tuning. "dash-dot" and "square" are defined
// and renderable but not assigned to any edge type yet -- spare options for EDGE_STYLE.
export type EdgeStyle =
  | "solid" | "dashed" | "dotted" | "dash-dot"
  | "zigzag" | "square" | "wavy" | "double";

export const EDGE_STYLE: Record<EdgeType, EdgeStyle> = {
  "shared-kanji":       "solid",
  "similar-kanji":      "zigzag",
  "same-reading":       "wavy",
  "alternate-spelling": "double",
};

// Per-style tuning. All lengths are in screen pixels -- like the library's own
// linkWidth they are divided by globalScale at draw time so the look is
// zoom-stable. dash = setLineDash pattern; amplitude/wavelength shape zigzag &
// wavy; gap = separation between the two strokes of a double line.
export const EDGE_STYLE_PARAMS = {
  dashed:     { dash: [5, 4] as number[] },
  dotted:     { dash: [0.5, 3] as number[] },
  "dash-dot": { dash: [6, 3, 0.5, 3] as number[] },
  zigzag:     { amplitude: 2.8, wavelength: 7 },
  square:     { amplitude: 2.6, wavelength: 8 },
  wavy:       { amplitude: 2.1, wavelength: 24 },
  double:     { gap: 3.6 },
} as const;

// Curated swatch palette for edge color selection. Excludes 'paper' (reserved for default node color).
const EDGE_SWATCH_NAMES = ["gold", "rose", "sky", "moss", "plum"] as const satisfies readonly AccentName[];
export const EDGE_COLOR_SWATCHES = EDGE_SWATCH_NAMES.map(
  (label) => ({ label, hex: ACCENT_COLORS[label] }),
);

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
export const DETAILS_PANEL_STATE_KEY = "kanji-graph:details-panel-state";

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
// Fixed camera zoom level when entering word view.
export const FOCUS_ZOOM = 5;
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
