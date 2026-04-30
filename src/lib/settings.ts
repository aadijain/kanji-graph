import type { EdgeType } from "../types";
import { SETTINGS_STORAGE_KEY, SETTINGS_LEGACY_KEY, SETTINGS_LEGACY_KEY_V2 } from "./constants";

export type AnimationSpeed = "instant" | "fast" | "normal" | "slow";
export type FocusZoom = "close" | "normal" | "far";
export type NeighborSpread = "tight" | "normal" | "wide";
export type LayoutDensity = "dense" | "normal" | "open" | "sparse";
export type NodeSize = "small" | "medium" | "large";
export type Theme = "dark" | "light";

export interface Settings {
  audioAutoPlay: boolean;
  audioServerUrl: string;
  edgeVisibility: Record<EdgeType, boolean>;
  animationSpeed: AnimationSpeed;
  focusZoom: FocusZoom;
  neighborSpread: NeighborSpread;
  layoutDensity: LayoutDensity;
  nodeSize: NodeSize;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  audioAutoPlay: true,
  audioServerUrl: "",
  edgeVisibility: { "shared-kanji": true, "same-reading": true, "similar-kanji": true },
  animationSpeed: "normal",
  focusZoom: "normal",
  neighborSpread: "normal",
  layoutDensity: "normal",
  nodeSize: "medium",
  theme: "dark",
};

// Mapping constants — shared between Graph.tsx and SettingsPanel.tsx.
export const ANIMATION_MS: Record<AnimationSpeed, number> = {
  instant: 0,
  fast: 300,
  normal: 700,
  slow: 1100,
};

export const FOCUS_ZOOM_VALUES: Record<FocusZoom, number> = {
  close: 2.5,
  normal: 3.5,
  far: 5.0,
};

export const NEIGHBOR_RADIUS_VALUES: Record<NeighborSpread, number> = {
  tight: 55,
  normal: 90,
  wide: 140,
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
  small: 13,
  medium: 18,
  large: 24,
};

const KEY = SETTINGS_STORAGE_KEY;
const KEY_V2 = SETTINGS_LEGACY_KEY_V2;
const KEY_V1 = SETTINGS_LEGACY_KEY;

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Settings>;
      return {
        ...DEFAULT_SETTINGS,
        ...p,
        edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility, ...p.edgeVisibility },
      };
    }
    // Migrate from v2: carry all preserved fields; theme defaults to "dark".
    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) {
      const v2 = JSON.parse(rawV2) as Partial<Omit<Settings, "theme">>;
      return {
        ...DEFAULT_SETTINGS,
        ...v2,
        edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility, ...v2.edgeVisibility },
        theme: "dark",
      };
    }
    // Migrate from v1: preserve the three fields that survived the redesign.
    const rawV1 = localStorage.getItem(KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1) as Record<string, unknown>;
      return {
        ...DEFAULT_SETTINGS,
        ...(typeof v1.audioAutoPlay === "boolean" && { audioAutoPlay: v1.audioAutoPlay }),
        ...(typeof v1.audioServerUrl === "string" && { audioServerUrl: v1.audioServerUrl }),
        edgeVisibility: {
          ...DEFAULT_SETTINGS.edgeVisibility,
          ...(v1.edgeVisibility as Partial<Record<EdgeType, boolean>> | undefined),
        },
      };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_SETTINGS, edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility } };
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
