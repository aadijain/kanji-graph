import { useMemo } from "react";
import { useStore } from "../store";
import { EDGE_TYPE_PRIORITY, FOCUS_HISTORY_NO_EDGE_COLOR } from "../lib/constants";
import { endpointId, type Edge, type EdgeType } from "../types";

export default function FocusHistory() {
  const focusHistory = useStore((s) => s.focusHistory);
  const rewindFocusHistory = useStore((s) => s.rewindFocusHistory);
  const graph = useStore((s) => s.graph);
  const edgeColors = useStore((s) => s.settings.edgeColors);
  const showFocusHistory = useStore((s) => s.settings.showFocusHistory);

  // Primary edge type between each consecutive pair in history.
  const separatorColors = useMemo(() => {
    if (!graph || focusHistory.length < 2) return [] as string[];
    const colors: string[] = [];
    for (let i = 0; i < focusHistory.length - 1; i++) {
      const aId = focusHistory[i].id;
      const bId = focusHistory[i + 1].id;
      const types = new Set<EdgeType>();
      for (const e of graph.edges as Edge[]) {
        const s = endpointId(e.source);
        const t = endpointId(e.target);
        if ((s === aId && t === bId) || (s === bId && t === aId)) types.add(e.type);
      }
      const primary = EDGE_TYPE_PRIORITY.find((t) => types.has(t));
      colors.push(primary ? edgeColors[primary] : FOCUS_HISTORY_NO_EDGE_COLOR);
    }
    return colors;
  }, [focusHistory, graph, edgeColors]);

  if (!showFocusHistory || focusHistory.length < 2) return null;

  return (
    <div className="flex items-center gap-1 rounded-md bg-ink-900 px-3 py-1.5 text-xs">
      {focusHistory.map((entry, i) => {
        const isCurrent = i === focusHistory.length - 1;
        return (
          <span key={`${entry.id}-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <span className="px-0.5 text-[10px]" style={{ color: separatorColors[i - 1] }}>
                ›
              </span>
            )}
            {isCurrent ? (
              <span className="jp font-medium text-accent-paper">{entry.word}</span>
            ) : (
              <button
                type="button"
                onClick={() => rewindFocusHistory(i)}
                className="jp text-ink-400 transition-colors hover:text-ink-100"
              >
                {entry.word}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
