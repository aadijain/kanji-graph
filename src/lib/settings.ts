import type { EdgeType } from "../types";

export interface Settings {
  audioAutoPlay: boolean;
  edgeVisibility: Record<EdgeType, boolean>;
}

const KEY = "kanji-graph:settings:v1";

export const DEFAULT_SETTINGS: Settings = {
  audioAutoPlay: true,
  edgeVisibility: {
    "shared-kanji": true,
    "same-reading": true,
    "similar-kanji": true,
  },
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility } };
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...p,
      edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility, ...p.edgeVisibility },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, edgeVisibility: { ...DEFAULT_SETTINGS.edgeVisibility } };
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
