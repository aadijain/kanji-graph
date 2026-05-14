import { useStore } from "../store";
import { EDGE_ENTRIES, BACK_STRIP_PANEL_LEFT } from "../lib/constants";
import type { EdgeType } from "../types";
import EdgeStyleSwatch from "./EdgeStyleSwatch";

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
      style={{ left: focused ? BACK_STRIP_PANEL_LEFT : 24 }}
      className="absolute bottom-6 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-secondary transition-all duration-200"
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
              <EdgeStyleSwatch type={type} color={edgeColors[type]} className="flex-shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
