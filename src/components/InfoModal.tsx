interface Props {
  onClose: () => void;
}

const INTERACTIONS = [
  ["Hover a word", "Show its connections"],
  ["Click a word", "Enter focus mode — zoom in, radial layout"],
  ["Click a neighbor or edge", "Navigate to that word's focus"],
  ["Hover a kanji (in focus)", "Filter edges to that kanji only"],
  ["Esc / click background", "Exit focus mode"],
];

const EDGE_TYPES = [
  { color: "rgba(212, 168, 87, 0.9)", label: "shared kanji", desc: "both words contain the same kanji character" },
  { color: "rgba(122, 168, 217, 0.9)", label: "same reading", desc: "homophones — identical hiragana reading" },
  { color: "rgba(168, 128, 212, 0.9)", label: "similar kanji", desc: "words contain visually confusable kanji pairs" },
];

export default function InfoModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
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
          A personal explorer for connections between Japanese words you've learned. Words are linked by shared kanji, homophones, and visually similar characters.
        </p>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Interactions</div>
          <div className="mt-2 space-y-1.5">
            {INTERACTIONS.map(([action, result]) => (
              <div key={action} className="flex gap-3 text-sm">
                <span className="w-44 shrink-0 text-ink-300">{action}</span>
                <span className="text-ink-500">{result}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">Edge types</div>
          <div className="mt-2 space-y-2">
            {EDGE_TYPES.map((e) => (
              <div key={e.label} className="flex items-start gap-3 text-sm">
                <span
                  className="mt-1.5 inline-block h-px w-6 shrink-0"
                  style={{ background: e.color }}
                />
                <div>
                  <span className="text-ink-100">{e.label}</span>
                  <span className="ml-2 text-ink-500">{e.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-ink-800 pt-4 text-[11px] text-ink-500">
          Dictionary:{" "}
          <span className="text-ink-300">Jitendex</span>
          {" · "}
          Audio:{" "}
          <span className="text-ink-300">Yomitan audio server</span>
        </div>
      </div>
    </div>
  );
}
