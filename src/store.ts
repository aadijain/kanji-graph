import { create } from "zustand";
import type { GraphData, WordNode } from "./types";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";

interface AppState {
  graph: GraphData | null;
  hovered: WordNode | null;
  focused: WordNode | null;
  hoveredKanji: string | null;
  hoveredReading: boolean;
  transitioning: boolean;
  pendingFocusWord: string | null;
  // Bridge for FocusOverlay to read the focused node's current screen coords
  // (Graph.tsx owns fgRef and the live node objects; T-12).
  focusScreenPosGetter: (() => { x: number; y: number } | null) | null;
  resetZoom: (() => void) | null;
  settings: Settings;
  setGraph: (g: GraphData) => void;
  setHovered: (n: WordNode | null) => void;
  setFocused: (n: WordNode | null) => void;
  setHoveredKanji: (k: string | null) => void;
  setHoveredReading: (v: boolean) => void;
  setTransitioning: (b: boolean) => void;
  setPendingFocusWord: (w: string | null) => void;
  setFocusScreenPosGetter: (fn: (() => { x: number; y: number } | null) | null) => void;
  setResetZoom: (fn: (() => void) | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const useStore = create<AppState>((set) => ({
  graph: null,
  hovered: null,
  focused: null,
  hoveredKanji: null,
  hoveredReading: false,
  transitioning: false,
  pendingFocusWord: null,
  focusScreenPosGetter: null,
  resetZoom: null,
  settings: loadSettings(),
  setGraph: (g) => set({ graph: g }),
  setHovered: (n) => set({ hovered: n }),
  setFocused: (n) => set({ focused: n, hoveredKanji: null, hoveredReading: false }),
  setHoveredKanji: (k) => set({ hoveredKanji: k, hoveredReading: false }),
  setHoveredReading: (v) => set({ hoveredReading: v, hoveredKanji: null }),
  setTransitioning: (b) => set({ transitioning: b }),
  setPendingFocusWord: (w) => set({ pendingFocusWord: w }),
  setFocusScreenPosGetter: (fn) => set({ focusScreenPosGetter: fn }),
  setResetZoom: (fn) => set({ resetZoom: fn }),
  updateSettings: (patch) =>
    set((state) => {
      const next = { ...state.settings, ...patch };
      saveSettings(next);
      return { settings: next };
    }),
}));
