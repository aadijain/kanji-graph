import { useStore } from "../store";
import { KANJI_RE } from "../lib/constants";

function BackEdge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Return to global view (Esc)"
      className="pointer-events-auto group absolute inset-y-0 left-0 w-14 cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-ink-800/0 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <span className="text-2xl text-ink-300">‹</span>
      </div>
    </button>
  );
}

export default function FocusOverlay() {
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const setHoveredKanji = useStore((s) => s.setHoveredKanji);
  const hoveredReading = useStore((s) => s.hoveredReading);
  const setHoveredReading = useStore((s) => s.setHoveredReading);
  const transitioning = useStore((s) => s.transitioning);

  if (!focused) return null;

  const chars = [...focused.word];

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        transitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      <BackEdge onClick={() => setFocused(null)} />
      <div className="pointer-events-auto -translate-y-24 text-center">
        <div className="jp flex justify-center text-6xl font-medium leading-none">
          {chars.map((ch, i) => {
            const isKanji = KANJI_RE.test(ch);
            const isActive = hoveredKanji === ch;
            const dim = !!hoveredKanji && !isActive;
            return (
              <span
                key={i}
                onMouseEnter={() => isKanji && setHoveredKanji(ch)}
                onMouseLeave={() => isKanji && setHoveredKanji(null)}
                className={[
                  "inline-block px-1 transition duration-150",
                  isKanji ? "cursor-pointer" : "",
                  isActive
                    ? "scale-110 text-accent-gold"
                    : (dim || hoveredReading)
                      ? "text-ink-500"
                      : isKanji
                        ? "text-white hover:text-accent-gold"
                        : "text-ink-300",
                ].join(" ")}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          className={`jp mt-3 cursor-pointer text-sm transition duration-150 ${hoveredReading ? "text-accent-sky" : "text-ink-300 hover:text-accent-sky"}`}
          onMouseEnter={() => setHoveredReading(true)}
          onMouseLeave={() => setHoveredReading(false)}
        >
          {focused.reading}
        </div>
      </div>
    </div>
  );
}
