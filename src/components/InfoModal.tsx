import { useStore } from "../store";
import { hexToRgba, EDGE_ENTRIES } from "../lib/constants";
import CloseButton from "./CloseButton";

interface Props {
  onClose: () => void;
}

// Graph view: default browsing mode, hover-driven.
const GLOBAL_VIEW = [
  ["Hover a word", "Show its connections"],
  ["Click a word", "Enter word view"],
  ["Type anything", "Search by kanji, reading, or romaji"],
] as const;

// Word view: click-driven, one word at a time.
const FOCUS_MODE = [
  ["Click a neighbor or edge", "Navigate to that word"],
  ["Hover a kanji", "Filter connections by that kanji"],
  ["Hover the reading", "Filter to same-reading connections"],
  ["<> in details", "Cycle through a word's dictionary entries"],
  ["Left edge / Esc", "Return to graph view"],
] as const;


function InteractionTable({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <div className="mt-1.5 space-y-1.5">
      {rows.map(([action, result]) => (
        <div key={action} className="flex gap-4 text-sm">
          <span className="w-44 shrink-0 text-ink-100">{action}</span>
          <span className="text-ink-500">{result}</span>
        </div>
      ))}
    </div>
  );
}

export default function InfoModal({ onClose }: Props) {
  const edgeColors = useStore((s) => s.settings.edgeColors);
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-xl rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton onClick={onClose} className="absolute right-4 top-4" />

        <h2 className="text-base font-semibold text-accent-paper">Kanji Graph</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Hover words to see connections. Click to enter word view and explore a word's neighborhood.
        </p>

        {/* Graph view */}
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Graph view</div>
          <InteractionTable rows={GLOBAL_VIEW} />
        </div>

        <hr className="mt-4 border-ink-800" />

        {/* Word view */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Word view</div>
          <InteractionTable rows={FOCUS_MODE} />
        </div>

        <hr className="mt-4 border-ink-800" />

        {/* Clipboard sync */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Clipboard sync</div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
            Enable <span className="text-ink-300">Settings → Clipboard → Follow clipboard</span> to
            focus a word by copying it. Press <span className="text-ink-300">Ctrl+V</span> on the graph to
            focus the copied word, or switch tabs for automatic focus on HTTPS.
          </p>
        </div>

        <hr className="mt-4 border-ink-800" />

        {/* Edge types */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Edge types</div>
          <div className="mt-1.5 space-y-2">
            {EDGE_ENTRIES.map(([type, { label, desc }]) => (
              <div key={type} className="flex items-start gap-3">
                <span
                  className="mt-[5px] inline-block h-px w-5 shrink-0"
                  style={{ background: hexToRgba(edgeColors[type], 0.9) }}
                />
                <div>
                  <div className="text-sm text-ink-100">{label}</div>
                  <div className="text-[11px] text-ink-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
