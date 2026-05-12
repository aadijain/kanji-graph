import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../store";
import { KANJI_RE, BACK_STRIP_WIDTH } from "../lib/constants";
import { graphRef } from "../lib/graphRef";
import { playPronunciation, stopAudio } from "../lib/audio";
import { getNodeEntries } from "../lib/utils";
import { endpointId } from "../types";

function BackEdge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Return to graph view (Esc)"
      style={{ width: BACK_STRIP_WIDTH }}
      className="pointer-events-auto group absolute inset-y-0 left-0 cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/80 via-ink-900/40 to-transparent transition-all duration-150 group-hover:from-ink-800 group-hover:via-ink-800/60" />
      <div className="absolute inset-0 flex items-center justify-start pl-3">
        <span className="text-5xl text-dim transition-all duration-150 group-hover:text-primary">‹</span>
      </div>
    </button>
  );
}

export default function FocusOverlay() {
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const focusedEntryIdx = useStore((s) => s.focusedEntryIdx);
  const setFocusedEntryIdx = useStore((s) => s.setFocusedEntryIdx);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const setHoveredKanji = useStore((s) => s.setHoveredKanji);
  const hoveredReading = useStore((s) => s.hoveredReading);
  const setHoveredReading = useStore((s) => s.setHoveredReading);
  const hovered = useStore((s) => s.hovered);
  const transitioning = useStore((s) => s.transitioning);
  const edgeColors = useStore((s) => s.settings.edgeColors);
  const edgeVisibility = useStore((s) => s.settings.edgeVisibility);
  const audioAutoPlay = useStore((s) => s.settings.audioAutoPlay);
  const graph = useStore((s) => s.graph);
  const wordRef = useRef<HTMLDivElement>(null);
  // Ref instead of state: we only need a guard against double-play; no visual
  // indicator is rendered here, so triggering a re-render would be wasteful.
  // DetailsPanel uses useState because it shows an animated speaker icon.
  const playingRef = useRef(false);

  useEffect(() => () => stopAudio(), []);

  // Anchor the word block to the focused node's live screen position.
  // Graph.tsx publishes a getter via the store; we update transform each frame
  // so the overlay rides the node during the camera+radial tween (and stays
  // glued if pan/zoom is later unlocked while focused).
  useEffect(() => {
    if (!focused) return;
    let raf = 0;
    const tick = () => {
      const el = wordRef.current;
      const get = graphRef.getFocusScreenPos;
      const p = get?.();
      if (el && p) {
        // -50% centers the block on the node; the -96px lift mirrors the
        // previous -translate-y-24 so the word floats above the dot.
        el.style.transform = `translate(${p.x}px, ${p.y - 96}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [focused]);

  // Reverse highlight: when a neighbor is hovered in word view, derive which
  // main-word kanji and which entry readings bridge the connection.
  const bridge = useMemo(() => {
    if (!focused || !hovered || hovered.id === focused.id || !graph) return null;
    const kanjiColors = new Map<string, string>();
    const readingColors = new Map<string, string>();
    const focusedChars = new Set([...focused.word]);
    for (const e of graph.edges) {
      if (!edgeVisibility[e.type]) continue;
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      const matches = (s === focused.id && t === hovered.id) || (t === focused.id && s === hovered.id);
      if (!matches) continue;
      const color = edgeColors[e.type];
      if (e.type === "same-reading") {
        for (const r of e.via) readingColors.set(r, color);
      } else {
        for (const k of e.via) {
          if (focusedChars.has(k)) kanjiColors.set(k, color);
        }
      }
    }
    return { kanjiColors, readingColors };
  }, [focused, hovered, graph, edgeVisibility, edgeColors]);

  if (!focused) return null;

  const chars = [...focused.word];
  const entries = getNodeEntries(focused);
  const activeIdx = Math.min(focusedEntryIdx, entries.length - 1);

  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
        transitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      <BackEdge onClick={() => setFocused(null)} />
      <div ref={wordRef} className="pointer-events-auto absolute left-0 top-0 text-center">
        <div className="jp flex justify-center text-6xl font-medium leading-none">
          {chars.map((ch, i) => {
            const isKanji = KANJI_RE.test(ch);
            const isActive = hoveredKanji === ch;
            const dim = !!hoveredKanji && !isActive;
            const bridgeColor = bridge?.kanjiColors.get(ch);
            const bridgeDim = !!bridge && !bridgeColor;
            return (
              <span
                key={i}
                onMouseEnter={() => isKanji && setHoveredKanji(ch)}
                onMouseLeave={() => isKanji && setHoveredKanji(null)}
                className={[
                  "inline-block px-1 transition duration-150",
                  isKanji ? "cursor-pointer" : "",
                  isActive
                    ? "scale-110"
                    : (dim || hoveredReading || bridgeDim)
                      ? "text-muted"
                      : isKanji
                        ? "text-primary"
                        : "text-secondary",
                ].join(" ")}
                style={
                  bridgeColor
                    ? { color: bridgeColor }
                    : isActive
                      ? { color: edgeColors["shared-kanji"] }
                      : undefined
                }
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div className="jp mt-3 flex flex-col items-center gap-0.5">
          {entries.map((e, i) => {
            const isActive = i === activeIdx;
            const bridgeReadingColor = bridge?.readingColors.get(e.reading);
            const bridgeDim = !!bridge && !bridgeReadingColor;
            const highlightReading =
              !hoveredKanji && !bridge && (hoveredReading ? hoveredReading === e.reading : isActive);
            return (
              <span
                key={i}
                onClick={() => {
                  if (i === activeIdx) return;
                  setFocusedEntryIdx(i);
                  if (audioAutoPlay && !playingRef.current) {
                    playingRef.current = true;
                    playPronunciation(focused.word, e.reading).finally(() => { playingRef.current = false; });
                  }
                }}
                onMouseEnter={() => setHoveredReading(e.reading)}
                onMouseLeave={() => setHoveredReading(null)}
                className={`cursor-pointer text-sm transition duration-150 ${isActive && !bridgeDim ? "" : "text-muted hover:text-secondary"}`}
                style={
                  bridgeReadingColor
                    ? { color: bridgeReadingColor }
                    : highlightReading
                      ? { color: edgeColors["same-reading"] }
                      : undefined
                }
              >
                {e.reading}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
