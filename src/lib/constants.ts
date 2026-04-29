import type { EdgeType } from "../types";

// ── localStorage keys ────────────────────────────────────────────────────────

export const LAYOUT_STORAGE_KEY = "kanji-graph:layout:v1";
export const SETTINGS_STORAGE_KEY = "kanji-graph:settings:v2";
export const SETTINGS_LEGACY_KEY = "kanji-graph:settings:v1";

// ── Text / language ──────────────────────────────────────────────────────────

export const KANJI_RE = /[一-鿿]/;
export const TTS_LANG = "ja-JP";
export const FONT_FAMILY = '"Noto Sans JP", "Hiragino Sans", sans-serif';

// ── Audio ────────────────────────────────────────────────────────────────────

// Default base for audio requests — routed through the Vite dev-server proxy
// to the Yomitan audio server running on the same host as the dev server.
// Override with VITE_AUDIO_BASE in .env.local or via Settings > Audio server URL.
export const AUDIO_DEFAULT_BASE = "/audio";

// ── Colors ───────────────────────────────────────────────────────────────────

export const NODE_COLORS = {
  default:      "#e8dccd",
  neighbor:     "#f3e7d3",
  focus:        "#ffffff",
  muted:        "#5a6078",
  edgeHidden:   "rgba(0, 0, 0, 0)",
  bridgeKanji:  "#d4a857",
  bridgeKanjiHi: "#ffd47a",
  background:   "#0b0c0f",
};

// Per edge-type color palette. `hex` is used in UI chrome (legend, toggles);
// active/muted/ambient are used in the canvas renderer.
export const EDGE_TYPE_META: Record<
  EdgeType,
  { label: string; hex: string; active: string; muted: string; ambient: string }
> = {
  "shared-kanji": {
    label: "shared kanji",
    hex: "#d4a857",
    active:  "rgba(212, 168, 87, 0.85)",
    muted:   "rgba(212, 168, 87, 0.18)",
    ambient: "rgba(212, 168, 87, 0.05)",
  },
  "similar-kanji": {
    label: "similar kanji",
    hex: "#a880d4",
    active:  "rgba(168, 128, 212, 0.85)",
    muted:   "rgba(168, 128, 212, 0.18)",
    ambient: "rgba(168, 128, 212, 0.05)",
  },
  "same-reading": {
    label: "same reading",
    hex: "#7aa8d9",
    active:  "rgba(122, 168, 217, 0.85)",
    muted:   "rgba(122, 168, 217, 0.18)",
    ambient: "rgba(122, 168, 217, 0.05)",
  },
};

// ── Graph renderer ───────────────────────────────────────────────────────────

export const GRAPH_BG = NODE_COLORS.background;
export const COOLDOWN_TICKS = 300;
export const D3_ALPHA_DECAY = 0.02;
export const D3_VELOCITY_DECAY = 0.3;
export const NODE_REL_SIZE = 4;
export const FOCUS_RING_RADIUS_MULTIPLIER = 2.4;
export const RESIZE_FIT_MS = 400;
export const ENGINE_STOP_FIT_MS = 600;
