import { useMemo, useState } from "react";
import { useStore } from "../store";
import { endpointId, type Edge } from "../types";
import { playPronunciation } from "../lib/audio";

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export default function DetailsPanel() {
  const hovered = useStore((s) => s.hovered);
  const focused = useStore((s) => s.focused);
  const graph = useStore((s) => s.graph);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const [playing, setPlaying] = useState(false);

  const subject = hovered ?? focused;

  const byKanji = useMemo(() => {
    if (!subject || !graph) return null;
    const map = new Map<string, string[]>();
    for (const k of subject.kanji) map.set(k, []);
    for (const e of graph.edges as Edge[]) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s !== subject.id && t !== subject.id) continue;
      const other = s === subject.id ? t : s;
      for (const k of e.via) {
        if (map.has(k)) map.get(k)!.push(other);
      }
    }
    return map;
  }, [subject, graph]);

  if (!subject) {
    return (
      <div className="pointer-events-none absolute right-6 top-6 max-w-xs text-right text-xs text-ink-500">
        hover a word · click to focus
      </div>
    );
  }

  return (
    <div className="absolute right-6 top-6 w-80 rounded-lg border border-ink-700 bg-ink-900/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="jp text-2xl font-semibold text-accent-paper">{subject.word}</div>
        <button
          type="button"
          aria-label="Play pronunciation"
          onClick={async () => {
            if (playing) return;
            setPlaying(true);
            await playPronunciation(subject.word, subject.reading);
            setPlaying(false);
          }}
          className={`rounded p-1 transition-colors ${
            playing
              ? "text-accent-gold"
              : "text-ink-500 hover:bg-ink-800 hover:text-accent-paper"
          }`}
        >
          <SpeakerIcon className={`h-4 w-4 ${playing ? "animate-pulse" : ""}`} />
        </button>
      </div>
      <div className="jp mt-1 text-sm text-ink-300">{subject.reading}</div>
      <div className="mt-3 text-sm leading-snug text-ink-100">
        {subject.glosses.join("; ")}
      </div>
      <div className="mt-3 flex gap-3 text-[11px] uppercase tracking-wide text-ink-500">
        {subject.jlpt != null && <span>JLPT N{subject.jlpt}</span>}
        {subject.frequency != null && <span>freq {subject.frequency}</span>}
      </div>

      {byKanji && byKanji.size > 0 && (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">
            connections
          </div>
          <div className="mt-2 space-y-2">
            {[...byKanji.entries()].map(([k, others]) => {
              const dim = !!hoveredKanji && hoveredKanji !== k;
              return (
                <div
                  key={k}
                  className={`flex items-start gap-3 transition-opacity ${
                    dim ? "opacity-30" : "opacity-100"
                  }`}
                >
                  <div className="jp w-6 shrink-0 text-lg text-accent-gold">{k}</div>
                  <div className="jp flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-ink-100">
                    {others.length > 0 ? (
                      others.map((o) => <span key={o}>{o}</span>)
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
