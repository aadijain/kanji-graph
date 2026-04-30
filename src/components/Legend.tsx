import { EDGE_TYPE_META } from "../lib/constants";

const ENTRIES = Object.values(EDGE_TYPE_META).map(({ active, label }) => ({ color: active, label }));

export default function Legend() {
  return (
    <div className="absolute bottom-6 left-6 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-[11px] text-ink-300">
      <div className="space-y-1">
        {ENTRIES.map((e) => (
          <div key={e.label} className="flex items-center gap-2">
            <span className="inline-block h-px w-6" style={{ background: e.color }} />
            <span>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
