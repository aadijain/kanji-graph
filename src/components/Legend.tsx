import { useStore } from "../store";
import { EDGE_TYPE_META } from "../lib/constants";
import type { EdgeType } from "../types";

const EDGE_ENTRIES = Object.entries(EDGE_TYPE_META) as [EdgeType, { label: string; hex: string }][];

export default function Legend() {
  const edgeColors = useStore((s) => s.settings.edgeColors);
  const edgeVisibility = useStore((s) => s.settings.edgeVisibility);
  const updateSettings = useStore((s) => s.updateSettings);
  const settings = useStore((s) => s.settings);
  const focused = useStore((s) => s.focused);

  function toggleEdge(type: EdgeType) {
    updateSettings({
      edgeVisibility: { ...settings.edgeVisibility, [type]: !settings.edgeVisibility[type] },
    });
  }

  return (
    <div
      className={`absolute bottom-6 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-[11px] text-ink-300 transition-all duration-200 ${focused ? "left-28" : "left-6"}`}
    >
      <div className="space-y-1">
        {EDGE_ENTRIES.map(([type, { label }]) => {
          const visible = edgeVisibility[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleEdge(type)}
              className={`flex w-full items-center gap-2 transition-opacity hover:opacity-100 ${visible ? "opacity-100" : "opacity-40"}`}
            >
              <span
                className="inline-block h-px w-6 flex-shrink-0"
                style={{ background: edgeColors[type] }}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
