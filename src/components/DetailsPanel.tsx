import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { endpointId, type Edge, type HighFreqConnection } from "../types";
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
  const hoveredReading = useStore((s) => s.hoveredReading);
  const edgeColors = useStore((s) => s.settings.edgeColors);
  const [playing, setPlaying] = useState(false);
  const [entryIdx, setEntryIdx] = useState(0);

  const subject = hovered ?? focused;

  useEffect(() => { setEntryIdx(0); }, [subject?.id]);

  const connections = useMemo(() => {
    if (!subject || !graph) return null;
    const byKanji = new Map<string, string[]>();
    for (const k of subject.kanji) byKanji.set(k, []);
    const sameReadingSet = new Set<string>();
    const sameReading: string[] = [];
    // key: neighbor kanji (K2); value: subject-side kanji (K1) + neighbor words
    const similarByKanji = new Map<string, { subjectKanji: string; others: string[] }>();
    for (const e of graph.edges as Edge[]) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s !== subject.id && t !== subject.id) continue;
      const other = s === subject.id ? t : s;
      if (e.type === "shared-kanji") {
        for (const k of e.via) if (byKanji.has(k)) byKanji.get(k)!.push(other);
      } else if (e.type === "same-reading") {
        if (!sameReadingSet.has(other)) { sameReadingSet.add(other); sameReading.push(other); }
      } else if (e.type === "similar-kanji") {
        const subjectKanji = e.via.find((k) => subject.kanji.includes(k));
        for (const k of e.via) {
          if (!subject.kanji.includes(k)) {
            const entry = similarByKanji.get(k) ?? { subjectKanji: subjectKanji ?? "", others: [] };
            entry.others.push(other);
            similarByKanji.set(k, entry);
          }
        }
      }
    }
    // High-freq connections: same lookup pattern for both edge types.
    // `c.kanji` is the character in this word (dim key); display is `c.partnerKanji ?? c.kanji`.
    const highFreq = (graph.highFreqConnections ?? []).filter((c: HighFreqConnection) =>
      c.words.includes(subject.id),
    );
    return { byKanji, sameReading, similarByKanji, highFreq };
  }, [subject, graph]);

  if (!subject) return null;

  const entries = subject.entries ?? [{ reading: subject.reading, glosses: subject.glosses, jlpt: subject.jlpt }];
  const clampedIdx = Math.min(entryIdx, entries.length - 1);
  const entry = entries[clampedIdx];

  return (
    <div className="absolute right-6 top-6 w-96 rounded-lg border border-ink-700 bg-ink-900 p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="jp text-2xl font-semibold text-accent-paper">{subject.word}</div>
        <button
          type="button"
          aria-label="Play pronunciation"
          onClick={async () => {
            if (playing) return;
            setPlaying(true);
            await playPronunciation(subject.word, entry.reading);
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
        {entries.length > 1 && (
          <div className="ml-auto flex items-center gap-1 text-[11px] text-ink-500">
            <button
              type="button"
              aria-label="Previous entry"
              disabled={clampedIdx === 0}
              onClick={() => setEntryIdx((i) => Math.max(0, i - 1))}
              className="rounded px-1 py-0.5 hover:bg-ink-800 disabled:opacity-30"
            >&lt;</button>
            <span>{clampedIdx + 1}/{entries.length}</span>
            <button
              type="button"
              aria-label="Next entry"
              disabled={clampedIdx === entries.length - 1}
              onClick={() => setEntryIdx((i) => Math.min(entries.length - 1, i + 1))}
              className="rounded px-1 py-0.5 hover:bg-ink-800 disabled:opacity-30"
            >&gt;</button>
          </div>
        )}
      </div>
      <div className="jp mt-1 text-sm text-ink-300">{entry.reading}</div>
      <ul className="mt-3 space-y-0.5 text-sm leading-snug text-ink-100">
        {entry.glosses.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
      <div className="mt-3 flex gap-3 text-[11px] uppercase tracking-wide text-ink-500">
        {entry.jlpt != null && <span>JLPT N{entry.jlpt}</span>}
        {subject.frequency != null && <span>rank #{subject.frequency}</span>}
      </div>

      {connections && (connections.byKanji.size > 0 || connections.highFreq.some((c) => c.type === "shared-kanji")) && (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">
            shared kanji
          </div>
          <div className="mt-2 space-y-2">
            {[...connections.byKanji.entries()].filter(([, others]) => others.length > 0).map(([k, others]) => {
              const dim = (!!hoveredKanji && hoveredKanji !== k) || hoveredReading;
              return (
                <div
                  key={k}
                  className={`flex items-start gap-3 transition-opacity ${
                    dim ? "opacity-30" : "opacity-100"
                  }`}
                >
                  <div className="jp w-6 shrink-0 text-lg" style={{ color: edgeColors["shared-kanji"] }}>{k}</div>
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
            {connections.highFreq.filter((c) => c.type === "shared-kanji").map((c) => {
              const dim = (!!hoveredKanji && hoveredKanji !== c.kanji) || hoveredReading;
              return (
                <div
                  key={`hf-${c.kanji}`}
                  className={`flex items-start gap-3 transition-opacity ${dim ? "opacity-30" : "opacity-100"}`}
                >
                  <div className="jp w-6 shrink-0 text-lg" style={{ color: edgeColors["shared-kanji"] }}>{c.kanji}</div>
                  <div className="text-sm text-ink-500">(hidden)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {connections && (connections.similarByKanji.size > 0 || connections.highFreq.some((c) => c.type === "similar-kanji")) && (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-500">
            similar kanji
          </div>
          <div className="mt-2 space-y-2">
            {[...connections.similarByKanji.entries()].map(([k, { subjectKanji, others }]) => {
              const dim = (!!hoveredKanji && hoveredKanji !== subjectKanji) || hoveredReading;
              return (
                <div
                  key={k}
                  className={`flex items-start gap-3 transition-opacity ${
                    dim ? "opacity-30" : "opacity-100"
                  }`}
                >
                  <div className="jp w-6 shrink-0 text-lg" style={{ color: edgeColors["similar-kanji"] }}>{k}</div>
                  <div className="jp flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-ink-100">
                    {others.map((o) => <span key={o}>{o}</span>)}
                  </div>
                </div>
              );
            })}
            {connections.highFreq.filter((c) => c.type === "similar-kanji").map((c) => {
              const dim = (!!hoveredKanji && hoveredKanji !== c.kanji) || hoveredReading;
              return (
                <div
                  key={`hf-${c.kanji}-${c.partnerKanji}`}
                  className={`flex items-start gap-3 transition-opacity ${dim ? "opacity-30" : "opacity-100"}`}
                >
                  <div className="jp w-6 shrink-0 text-lg" style={{ color: edgeColors["similar-kanji"] }}>{c.partnerKanji}</div>
                  <div className="text-sm text-ink-500">(hidden)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {connections && connections.sameReading.length > 0 && (
        <div className={`mt-4 border-t border-ink-700 pt-3 transition-opacity ${hoveredKanji ? "opacity-30" : "opacity-100"}`}>
          <div className="text-[11px] uppercase tracking-wide text-ink-500">
            same reading
          </div>
          <div className="jp mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-sm"
               style={{ color: edgeColors["same-reading"] }}>
            {connections.sameReading.map((o) => <span key={o}>{o}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
