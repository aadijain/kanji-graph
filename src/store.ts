import { create } from "zustand";
import type { GraphData, WordNode } from "./types";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";
import { FOCUS_HISTORY_MAX } from "./lib/constants";

interface AppState {
  graph: GraphData | null;
  hovered: WordNode | null;
  focused: WordNode | null;
  focusedEntryIdx: number;
  focusHistory: WordNode[];
  hoveredKanji: string | null;
  hoveredReading: boolean;
  transitioning: boolean;
  pendingFocusWord: string | null;
  settings: Settings;
  setGraph: (g: GraphData) => void;
  setHovered: (n: WordNode | null) => void;
  setFocused: (n: WordNode | null) => void;
  setFocusedEntryIdx: (idx: number) => void;
  rewindFocusHistory: (idx: number) => void;
  setHoveredKanji: (k: string | null) => void;
  setHoveredReading: (v: boolean) => void;
  setTransitioning: (b: boolean) => void;
  setPendingFocusWord: (w: string | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const useStore = create<AppState>((set) => ({
  graph: null,
  hovered: null,
  focused: null,
  focusedEntryIdx: 0,
  focusHistory: [],
  hoveredKanji: null,
  hoveredReading: false,
  transitioning: false,
  pendingFocusWord: null,
  settings: loadSettings(),
  setGraph: (g) => set({ graph: g }),
  setHovered: (n) => set({ hovered: n }),
  setFocused: (n) =>
    set((state) => {
      if (!n) return { focused: null, focusedEntryIdx: 0, focusHistory: [], hoveredKanji: null, hoveredReading: false };
      const prev = state.focusHistory;
      if (prev[prev.length - 1]?.id === n.id) return { focused: n, focusedEntryIdx: 0, hoveredKanji: null, hoveredReading: false };
      return { focused: n, focusedEntryIdx: 0, focusHistory: [...prev, n].slice(-FOCUS_HISTORY_MAX), hoveredKanji: null, hoveredReading: false };
    }),
  setFocusedEntryIdx: (idx) => set({ focusedEntryIdx: idx }),
  rewindFocusHistory: (idx) =>
    set((state) => {
      const word = state.focusHistory[idx];
      if (!word) return {};
      return { focused: word, focusHistory: state.focusHistory.slice(0, idx + 1), hoveredKanji: null, hoveredReading: false };
    }),
  setHoveredKanji: (k) => set({ hoveredKanji: k, hoveredReading: false }),
  setHoveredReading: (v) => set({ hoveredReading: v, hoveredKanji: null }),
  setTransitioning: (b) => set({ transitioning: b }),
  setPendingFocusWord: (w) => set({ pendingFocusWord: w }),
  updateSettings: (patch) =>
    set((state) => {
      const next = { ...state.settings, ...patch };
      saveSettings(next);
      return { settings: next };
    }),
}));
