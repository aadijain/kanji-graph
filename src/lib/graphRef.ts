// Imperative handles to the graph renderer, registered by Graph.tsx on mount
// and cleared on unmount. A plain mutable object is correct here: these are
// not state (no re-render needed when they change) and storing callbacks in
// Zustand breaks its immutable-update semantics.
export const graphRef = {
  getFocusScreenPos: null as (() => { x: number; y: number } | null) | null,
  resetZoom: null as (() => void) | null,
};
