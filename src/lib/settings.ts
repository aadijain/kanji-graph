// User-facing preset mappings (label -> numeric value) live here alongside the
// Settings schema. Internal/non-user-facing constants belong in constants.ts.

import type { EdgeType } from "../types";
import { SETTINGS_STORAGE_KEY, SETTINGS_LEGACY_KEY, SETTINGS_LEGACY_KEY_V2, EDGE_TYPE_META, ACCENT_COLORS } from "./constants";

export type AnimationSpeed = "instant" | "fast" | "normal" | "slow";
export type NeighborSpread = "tight" | "normal" | "wide";
export type LayoutDensity = "dense" | "normal" | "open" | "sparse";
export type NodeSize = "small" | "medium" | "large";
export type Theme = "dark" | "light";

export interface Settings {
  audioAutoPlay: boolean;
  localAudioEnabled: boolean;
  audioServerUrl: string;
  edgeVisibility: Record<EdgeType, boolean>;
  edgeColors: Record<EdgeType, string>;
  animationSpeed: AnimationSpeed;
  neighborSpread: NeighborSpread;
  layoutDensity: LayoutDensity;
  nodeSize: NodeSize;
  nodeSizeByFrequency: boolean;
  theme: Theme;
  clipboardSyncEnabled: boolean;
  showFps: boolean;
  showFocusHistory: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  audioAutoPlay: true,
  localAudioEnabled: false,
  audioServerUrl: "",
  edgeVisibility: Object.fromEntries(Object.keys(EDGE_TYPE_META).map((k) => [k, true])) as Record<EdgeType, boolean>,
  edgeColors: Object.fromEntries(Object.entries(EDGE_TYPE_META).map(([k, v]) => [k, ACCENT_COLORS[v.color]])) as Record<EdgeType, string>,
  animationSpeed: "normal",
  neighborSpread: "normal",
  layoutDensity: "normal",
  nodeSize: "medium",
  nodeSizeByFrequency: false,
  theme: "dark",
  clipboardSyncEnabled: false,
  showFps: false,
  showFocusHistory: true,
};

// Mapping constants — shared between Graph.tsx and SettingsPanel.tsx.
export const ANIMATION_MS: Record<AnimationSpeed, number> = {
  instant: 0,
  fast: 300,
  normal: 700,
  slow: 1100,
};

export const NEIGHBOR_RADIUS_VALUES: Record<NeighborSpread, number> = {
  tight: 55,
  normal: 90,
  wide: 120,
};

export const LAYOUT_DENSITY_VALUES: Record<
  LayoutDensity,
  { linkDistance: number; chargeStrength: number }
> = {
  dense:  { linkDistance: 15, chargeStrength: -15 },
  normal: { linkDistance: 30, chargeStrength: -30 },
  open:   { linkDistance: 60, chargeStrength: -60 },
  sparse: { linkDistance: 100, chargeStrength: -100 },
};

// Controls the canvas label font size (basePx / globalScale in the render loop).
export const NODE_SIZE_VALUES: Record<NodeSize, number> = {
  small: 24,
  medium: 30,
  large: 36,
};

// Each entry: the localStorage key for that schema version and a function that
// reads the raw JSON string and returns a full Settings object for the current
// version. Ordered newest-first; the first matching key wins.
// To add v4: prepend a new entry with SETTINGS_STORAGE_KEY_V4 and its transform.
const MIGRATIONS: { key: string; migrate(raw: string): Settings }[] = [
  {
    key: SETTINGS_STORAGE_KEY,
    migrate(raw) {
      // `focusZoom` was removed in-place (no schema bump); strip it from stored data so it doesn't perpetuate.
      const { focusZoom: _, ...p } = JSON.parse(raw) as Partial<Settings> & { focusZoom?: unknown };
      return {
        ...DEFAULT_SETTINGS,
        ...p,
        edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility, ...p.edgeVisibility },
        edgeColors: { ...DEFAULT_SETTINGS.edgeColors, ...p.edgeColors },
      };
    },
  },
  {
    // v2 → v3: theme was added; carry all preserved fields but default theme to "dark".
    key: SETTINGS_LEGACY_KEY_V2,
    migrate(raw) {
      const v2 = JSON.parse(raw) as Partial<Omit<Settings, "theme">>;
      return {
        ...DEFAULT_SETTINGS,
        ...v2,
        edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility, ...v2.edgeVisibility },
        edgeColors: { ...DEFAULT_SETTINGS.edgeColors },
        theme: "dark",
      };
    },
  },
  {
    // v1 → v3: only three fields survived the v1→v2 redesign.
    key: SETTINGS_LEGACY_KEY,
    migrate(raw) {
      const v1 = JSON.parse(raw) as Record<string, unknown>;
      return {
        ...DEFAULT_SETTINGS,
        ...(typeof v1.audioAutoPlay === "boolean" && { audioAutoPlay: v1.audioAutoPlay }),
        ...(typeof v1.audioServerUrl === "string" && { audioServerUrl: v1.audioServerUrl }),
        edgeVisibility: {
          ...DEFAULT_SETTINGS.edgeVisibility,
          ...(v1.edgeVisibility as Partial<Record<EdgeType, boolean>> | undefined),
        },
      };
    },
  },
];

export function loadSettings(): Settings {
  try {
    for (const { key, migrate } of MIGRATIONS) {
      const raw = localStorage.getItem(key);
      if (raw) return migrate(raw);
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_SETTINGS, edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility } };
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
}
