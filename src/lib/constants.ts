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

// Per edge-type metadata. `hex` is the default color used in UI chrome and as
// the canvas palette base. Canvas active/muted/ambient are computed dynamically
// from the user's chosen color via hexToRgba, so only label + hex live here.
export const EDGE_TYPE_META: Record<EdgeType, { label: string; hex: string }> = {
  "shared-kanji": { label: "shared kanji", hex: "#d4a857" },
  "similar-kanji": { label: "similar kanji", hex: "#a880d4" },
  "same-reading":  { label: "same reading",  hex: "#7aa8d9" },
};

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

// ── Graph renderer ───────────────────────────────────────────────────────────

export const GRAPH_BG = NODE_COLORS.background;
export const COOLDOWN_TICKS = 300;
export const D3_ALPHA_DECAY = 0.02;
export const D3_VELOCITY_DECAY = 0.3;
export const NODE_REL_SIZE = 4;
export const FOCUS_RING_RADIUS_MULTIPLIER = 2.4;
export const RESIZE_FIT_MS = 400;
export const ENGINE_STOP_FIT_MS = 600;
export const FOCUS_HISTORY_MAX = 10;
