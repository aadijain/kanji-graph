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
  ["Left edge / Esc", "Return to graph view"],
] as const;

const EDGE_TYPES = [
  { color: "rgba(212, 168, 87, 0.9)", label: "shared kanji", desc: "both words contain the same kanji character" },
  { color: "rgba(168, 128, 212, 0.9)", label: "similar kanji", desc: "words contain visually confusable kanji pairs" },
  { color: "rgba(122, 168, 217, 0.9)", label: "same reading", desc: "homophones — identical hiragana reading" },
];

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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-xl rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
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
            {EDGE_TYPES.map((e) => (
              <div key={e.label} className="flex items-start gap-3">
                <span
                  className="mt-[5px] inline-block h-px w-5 shrink-0"
                  style={{ background: e.color }}
                />
                <div>
                  <div className="text-sm text-ink-100">{e.label}</div>
                  <div className="text-[11px] text-ink-500">{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
