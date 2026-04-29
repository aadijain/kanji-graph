import { useStore } from "../store";
import type { EdgeType } from "../types";

const LAYOUT_KEY = "kanji-graph:layout:v1";

const EDGE_ENTRIES: { type: EdgeType; label: string; color: string }[] = [
  { type: "shared-kanji", label: "shared kanji", color: "rgba(212, 168, 87, 0.9)" },
  { type: "same-reading", label: "same reading", color: "rgba(122, 168, 217, 0.9)" },
  { type: "similar-kanji", label: "similar kanji", color: "rgba(168, 128, 212, 0.9)" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent-gold" : "bg-ink-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-950 shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  function toggleEdge(type: EdgeType) {
    updateSettings({
      edgeVisibility: { ...settings.edgeVisibility, [type]: !settings.edgeVisibility[type] },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-base font-semibold text-accent-paper">Settings</h2>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Audio</div>
          <div className="mt-2">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-ink-100">Auto-play on focus</span>
              <Toggle
                checked={settings.audioAutoPlay}
                onChange={() => updateSettings({ audioAutoPlay: !settings.audioAutoPlay })}
              />
            </label>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Edge types</div>
          <div className="mt-2 space-y-2.5">
            {EDGE_ENTRIES.map(({ type, label, color }) => (
              <label key={type} className="flex cursor-pointer items-center gap-3">
                <span className="inline-block h-px w-6 flex-shrink-0" style={{ background: color }} />
                <span className="flex-1 text-sm text-ink-100">{label}</span>
                <Toggle
                  checked={settings.edgeVisibility[type]}
                  onChange={() => toggleEdge(type)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Layout</div>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(LAYOUT_KEY);
                window.location.reload();
              }}
              className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
            >
              Reset layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
