import { useStore } from "../store";

const KANJI_RE = /[一-鿿]/;

export default function FocusOverlay() {
  const focused = useStore((s) => s.focused);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const setHoveredKanji = useStore((s) => s.setHoveredKanji);
  const transitioning = useStore((s) => s.transitioning);

  if (!focused) return null;

  const chars = [...focused.word];

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        transitioning ? "opacity-0" : "opacity-100"
      }`}
    >
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
                  "px-1 transition-colors duration-150",
                  isKanji ? "cursor-pointer" : "",
                  isActive
                    ? "text-accent-gold"
                    : dim
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
        <div className="jp mt-3 text-sm text-ink-300">{focused.reading}</div>
      </div>
    </div>
  );
}
