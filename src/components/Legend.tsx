import { useStore } from "../store";
import { EDGE_TYPE_META } from "../lib/constants";
import type { EdgeType } from "../types";

const EDGE_ENTRIES = Object.entries(EDGE_TYPE_META) as [EdgeType, { label: string; hex: string }][];

export default function Legend() {
  const edgeColors = useStore((s) => s.settings.edgeColors);

  return (
    <div className="absolute bottom-6 left-6 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-[11px] text-ink-300">
      <div className="space-y-1">
        {EDGE_ENTRIES.map(([type, { label }]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="inline-block h-px w-6" style={{ background: edgeColors[type] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
