import { describe, it, expect, beforeEach } from "vitest";
import { installLocalStorage } from "../setup/localStorage";

installLocalStorage();

const { useStore } = await import("../../src/store");
const { FOCUS_HISTORY_MAX } = await import("../../src/lib/constants");

import type { WordNode } from "../../src/types";

const node = (id: string): WordNode => ({
  id, word: id, reading: "", glosses: [], entries: [], kanji: [],
});

beforeEach(() => {
  useStore.setState({
    graph: null,
    hovered: null,
    focused: null,
    focusedEntryIdx: 0,
    focusHistory: [],
    hoveredKanji: null,
    hoveredReading: null,
    transitioning: false,
    pendingFocusWord: null,
  });
});

describe("store.setFocused", () => {
  it("clears focus history when passed null", () => {
    const s = useStore.getState();
    s.setFocused(node("A"));
    s.setFocused(node("B"));
    s.setFocused(null);
    expect(useStore.getState().focused).toBeNull();
    expect(useStore.getState().focusHistory).toEqual([]);
  });

  it("appends to focusHistory in order", () => {
    const s = useStore.getState();
    s.setFocused(node("A"));
    s.setFocused(node("B"));
    s.setFocused(node("C"));
    expect(useStore.getState().focusHistory.map((n) => n.id)).toEqual(["A", "B", "C"]);
  });

  it("doesn't duplicate when re-focusing the same word", () => {
    const s = useStore.getState();
    s.setFocused(node("A"));
    s.setFocused(node("A"));
    expect(useStore.getState().focusHistory.map((n) => n.id)).toEqual(["A"]);
  });

  it("caps history at FOCUS_HISTORY_MAX", () => {
    const s = useStore.getState();
    for (let i = 0; i < FOCUS_HISTORY_MAX + 3; i++) s.setFocused(node(`w${i}`));
    const h = useStore.getState().focusHistory;
    expect(h).toHaveLength(FOCUS_HISTORY_MAX);
    expect(h[0].id).toBe("w3");
    expect(h[h.length - 1].id).toBe(`w${FOCUS_HISTORY_MAX + 2}`);
  });

  it("clears hover state on focus change", () => {
    useStore.setState({ hoveredKanji: "人", hoveredReading: null });
    useStore.getState().setFocused(node("A"));
    expect(useStore.getState().hoveredKanji).toBeNull();
  });
});

describe("store.rewindFocusHistory", () => {
  it("slices history up to and including idx, refocusing that word", () => {
    const s = useStore.getState();
    s.setFocused(node("A"));
    s.setFocused(node("B"));
    s.setFocused(node("C"));
    useStore.getState().rewindFocusHistory(0);
    expect(useStore.getState().focused?.id).toBe("A");
    expect(useStore.getState().focusHistory.map((n) => n.id)).toEqual(["A"]);
  });

  it("is a no-op when idx is out of range", () => {
    const s = useStore.getState();
    s.setFocused(node("A"));
    useStore.getState().rewindFocusHistory(99);
    expect(useStore.getState().focused?.id).toBe("A");
  });
});

describe("store hover mutex", () => {
  it("setHoveredKanji clears hoveredReading", () => {
    useStore.setState({ hoveredReading: "ひと" });
    useStore.getState().setHoveredKanji("人");
    expect(useStore.getState().hoveredReading).toBeNull();
    expect(useStore.getState().hoveredKanji).toBe("人");
  });

  it("setHoveredReading clears hoveredKanji", () => {
    useStore.setState({ hoveredKanji: "人" });
    useStore.getState().setHoveredReading("ひと");
    expect(useStore.getState().hoveredKanji).toBeNull();
    expect(useStore.getState().hoveredReading).toBe("ひと");
  });
});
