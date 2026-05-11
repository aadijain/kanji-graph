import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { endpointId, type Edge, type HighFreqConnection } from "../types";
import { playPronunciation, stopAudio } from "../lib/audio";
import { getNodeEntries } from "../lib/utils";

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
  const focusedEntryIdx = useStore((s) => s.focusedEntryIdx);
  const setFocusedEntryIdx = useStore((s) => s.setFocusedEntryIdx);
  const graph = useStore((s) => s.graph);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const hoveredReading = useStore((s) => s.hoveredReading);
  const edgeColors = useStore((s) => s.settings.edgeColors);
  const audioAutoPlay = useStore((s) => s.settings.audioAutoPlay);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopAudio(), []);
  const [neighborEntryIdx, setNeighborEntryIdx] = useState(0);

  const activeNode = hovered ?? focused;
  const isActiveNodeFocused = activeNode?.id === focused?.id;

  // For neighbors: auto-select the entry matching the same-reading edge to focused.
  // Read focused/graph imperatively so this only re-runs on active-node identity
  // change, not on every graph update or focus pointer change.
  useEffect(() => {
    const { hovered: h, focused: f, graph: g } = useStore.getState();
    const active = h ?? f;
    if (active && f && g && active.id !== f.id) {
      const edge = (g.edges as Edge[]).find((e) => {
        const s = endpointId(e.source);
        const t = endpointId(e.target);
        return e.type === "same-reading" &&
          ((s === active.id && t === f.id) || (s === f.id && t === active.id));
      });
      if (edge) {
        const idx = getNodeEntries(active).findIndex((e) => e.reading === edge.via[0]);
        setNeighborEntryIdx(idx >= 0 ? idx : 0);
        return;
      }
    }
    setNeighborEntryIdx(0);
  }, [activeNode?.id]);

  const connections = useMemo(() => {
    if (!activeNode || !graph) return null;
    const byKanji = new Map<string, string[]>();
    for (const k of activeNode.kanji) byKanji.set(k, []);
    const sameReadingSet = new Set<string>();
    const sameReading: string[] = [];
    const altSpellingSet = new Set<string>();
    const alternateSpellings: string[] = [];
    // key: neighbor kanji (K2); value: activeNode-side kanji (K1) + neighbor words
    const similarByKanji = new Map<string, { activeNodeKanji: string; others: string[] }>();
    for (const e of graph.edges as Edge[]) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s !== activeNode.id && t !== activeNode.id) continue;
      const other = s === activeNode.id ? t : s;
      if (e.type === "shared-kanji") {
        for (const k of e.via) if (byKanji.has(k)) byKanji.get(k)!.push(other);
      } else if (e.type === "same-reading") {
        if (!sameReadingSet.has(other)) { sameReadingSet.add(other); sameReading.push(other); }
      } else if (e.type === "alternate-spelling") {
        if (!altSpellingSet.has(other)) { altSpellingSet.add(other); alternateSpellings.push(other); }
      } else if (e.type === "similar-kanji") {
        const activeNodeKanji = e.via.find((k) => activeNode.kanji.includes(k));
        for (const k of e.via) {
          if (!activeNode.kanji.includes(k)) {
            const entry = similarByKanji.get(k) ?? { activeNodeKanji: activeNodeKanji ?? "", others: [] };
            entry.others.push(other);
            similarByKanji.set(k, entry);
          }
        }
      }
    }
    // High-freq connections: same lookup pattern for both edge types.
    // `c.kanji` is the character in this word (dim key); display is `c.partnerKanji ?? c.kanji`.
    const highFreq = (graph.highFreqConnections ?? []).filter((c: HighFreqConnection) =>
      c.words.includes(activeNode.id),
    );
    return { byKanji, sameReading, similarByKanji, highFreq, alternateSpellings };
  }, [activeNode, graph]);

  if (!activeNode) return null;

  const entries = getNodeEntries(activeNode);
  const rawIdx = isActiveNodeFocused ? focusedEntryIdx : neighborEntryIdx;
  const clampedIdx = Math.min(rawIdx, entries.length - 1);
  const entry = entries[clampedIdx];

  const navEntry = (delta: number) => {
    const next = Math.min(entries.length - 1, Math.max(0, clampedIdx + delta));
    if (isActiveNodeFocused) setFocusedEntryIdx(next);
    else setNeighborEntryIdx(next);
    const nextEntry = entries[next];
    if (audioAutoPlay && !playing && nextEntry) {
      setPlaying(true);
      playPronunciation(activeNode.word, nextEntry.reading).finally(() => setPlaying(false));
    }
  };

  return (
    <div className="absolute right-6 top-6 w-96 rounded-lg border border-ink-700 bg-ink-900 p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="jp text-2xl font-semibold text-accent-paper">{activeNode.word}</div>
        <button
          type="button"
          aria-label="Play pronunciation"
          onClick={async () => {
            if (playing) return;
            setPlaying(true);
            await playPronunciation(activeNode.word, entry.reading);
            setPlaying(false);
          }}
          className={`rounded p-1 transition-colors ${
            playing
              ? "text-accent-gold"
              : "text-muted hover:bg-ink-800 hover:text-accent-paper"
          }`}
        >
          <SpeakerIcon className={`h-4 w-4 ${playing ? "animate-pulse" : ""}`} />
        </button>
        {entries.length > 1 && (
          <div className="ml-auto flex items-center gap-1 text-xs text-muted">
            <button
              type="button"
              aria-label="Previous entry"
              disabled={clampedIdx === 0}
              onClick={() => navEntry(-1)}
              className="rounded px-1 py-0.5 hover:bg-ink-800 disabled:opacity-30"
            >&lt;</button>
            <span>{clampedIdx + 1}/{entries.length}</span>
            <button
              type="button"
              aria-label="Next entry"
              disabled={clampedIdx === entries.length - 1}
              onClick={() => navEntry(1)}
              className="rounded px-1 py-0.5 hover:bg-ink-800 disabled:opacity-30"
            >&gt;</button>
          </div>
        )}
      </div>
      <div className="jp mt-1 text-sm text-secondary">{entry.reading}</div>
      <ul className="mt-3 space-y-0.5 text-sm leading-snug text-primary">
        {entry.glosses.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
      <div className="mt-3 flex text-xs uppercase tracking-wide text-muted">
        {entry.jlpt != null && <span>JLPT N{entry.jlpt}</span>}
        {activeNode.frequency != null && <span className="ml-auto">#{activeNode.frequency}</span>}
      </div>

      {connections && ([...connections.byKanji.values()].some((v) => v.length > 0) || connections.highFreq.some((c) => c.type === "shared-kanji")) && (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <div className="text-xs uppercase tracking-wide text-muted">
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
                  <div className="jp flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-primary">
                    {others.length > 0 ? (
                      others.map((o) => <span key={o}>{o}</span>)
                    ) : (
                      <span className="text-muted">—</span>
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
                  <div className="text-sm text-muted">(hidden)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {connections && (connections.similarByKanji.size > 0 || connections.highFreq.some((c) => c.type === "similar-kanji")) && (
        <div className="mt-4 border-t border-ink-700 pt-3">
          <div className="text-xs uppercase tracking-wide text-muted">
            similar kanji
          </div>
          <div className="mt-2 space-y-2">
            {[...connections.similarByKanji.entries()].map(([k, { activeNodeKanji, others }]) => {
              const dim = (!!hoveredKanji && hoveredKanji !== activeNodeKanji) || hoveredReading;
              return (
                <div
                  key={k}
                  className={`flex items-start gap-3 transition-opacity ${
                    dim ? "opacity-30" : "opacity-100"
                  }`}
                >
                  <div className="jp w-6 shrink-0 text-lg" style={{ color: edgeColors["similar-kanji"] }}>{k}</div>
                  <div className="jp flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-primary">
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
                  <div className="text-sm text-muted">(hidden)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {connections && connections.sameReading.length > 0 && (
        <div className={`mt-4 border-t border-ink-700 pt-3 transition-opacity ${hoveredKanji ? "opacity-30" : "opacity-100"}`}>
          <div className="text-xs uppercase tracking-wide text-muted">
            same reading
          </div>
          <div className="jp mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-sm"
               style={{ color: edgeColors["same-reading"] }}>
            {connections.sameReading.map((o) => <span key={o}>{o}</span>)}
          </div>
        </div>
      )}

      {connections && connections.alternateSpellings.length > 0 && (
        <div className={`mt-4 border-t border-ink-700 pt-3 transition-opacity ${hoveredKanji ? "opacity-30" : "opacity-100"}`}>
          <div className="text-xs uppercase tracking-wide text-muted">
            alternate spelling
          </div>
          <div className="jp mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-sm"
               style={{ color: edgeColors["alternate-spelling"] }}>
            {connections.alternateSpellings.map((o) => <span key={o}>{o}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
