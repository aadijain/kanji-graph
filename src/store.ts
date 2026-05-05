import { create } from "zustand";
import type { GraphData, WordNode } from "./types";

interface AppState {
  graph: GraphData | null;
  hovered: WordNode | null;
  focused: WordNode | null;
  hoveredKanji: string | null;
  transitioning: boolean;
  setGraph: (g: GraphData) => void;
  setHovered: (n: WordNode | null) => void;
  setFocused: (n: WordNode | null) => void;
  setHoveredKanji: (k: string | null) => void;
  setTransitioning: (b: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  graph: null,
  hovered: null,
  focused: null,
  hoveredKanji: null,
  transitioning: false,
  setGraph: (g) => set({ graph: g }),
  setHovered: (n) => set({ hovered: n }),
  setFocused: (n) => set({ focused: n, hoveredKanji: null }),
  setHoveredKanji: (k) => set({ hoveredKanji: k }),
  setTransitioning: (b) => set({ transitioning: b }),
}));
