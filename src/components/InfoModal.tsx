import { useStore } from "../store";
import { hexToRgba, EDGE_ENTRIES } from "../lib/constants";
import CloseButton from "./CloseButton";
import EdgeStyleSwatch from "./EdgeStyleSwatch";

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
  ["Click a neighbor", "Navigate to that word"],
  ["Hover a kanji", "Filter connections by that kanji"],
  ["Hover the reading", "Filter to same-reading connections"],
  ["Hover a neighbor", "Highlight the bridging kanji or reading in the main word"],
  ["Details panel: ∧", "Cycle collapsed / summary / full"],
  ["Details panel: <,>", "Cycle through a word's dictionary entries"],
  ["Left edge / Esc", "Return to graph view"],
] as const;


function InteractionTable({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <div className="mt-1.5 space-y-1.5">
      {rows.map(([action, result]) => (
        <div key={action} className="flex gap-4 text-sm">
          <span className="w-44 shrink-0 text-primary">{action}</span>
          <span className="text-muted">{result}</span>
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
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          Hover words to see connections. Click to enter word view and explore a word's neighborhood.
        </p>

        {/* Graph view */}
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-muted">Graph view</div>
          <InteractionTable rows={GLOBAL_VIEW} />
        </div>

        <hr className="mt-4 border-ink-800" />

        {/* Word view */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-muted">Word view</div>
          <InteractionTable rows={FOCUS_MODE} />
        </div>

        <hr className="mt-4 border-ink-800" />

        {/* Clipboard sync */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-muted">Clipboard sync</div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Enable <span className="text-secondary">Settings → Clipboard → Follow clipboard</span> to
            focus a word by copying it. Press <span className="text-secondary">Ctrl+V</span> on the graph to
            focus the copied word, or switch tabs for automatic focus on HTTPS.
          </p>
        </div>

        <hr className="mt-4 border-ink-800" />

        {/* Edge types */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-muted">Edge types</div>
          <div className="mt-1.5 space-y-2">
            {EDGE_ENTRIES.map(([type, { label, desc }]) => (
              <div key={type} className="flex items-start gap-3">
                <EdgeStyleSwatch
                  type={type}
                  color={hexToRgba(edgeColors[type], 0.9)}
                  className="mt-[3px] shrink-0"
                />
                <div>
                  <div className="text-sm text-primary">{label}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
