import { useStore } from "../store";

export default function StatsBar() {
  const graph = useStore((s) => s.graph);
  if (!graph) return null;
  const { words, edges, kanji } = graph.stats;
  return (
    <div className="pointer-events-none absolute left-6 top-6 flex gap-5 text-[11px] uppercase tracking-[0.18em] text-ink-300">
      <span>
        <span className="text-accent-paper">{words}</span> words
      </span>
      <span>
        <span className="text-accent-paper">{kanji}</span> kanji
      </span>
      <span>
        <span className="text-accent-paper">{edges}</span> connections
      </span>
    </div>
  );
}
