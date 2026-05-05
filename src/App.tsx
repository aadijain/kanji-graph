import { useEffect } from "react";
import { useStore } from "./store";
import Graph from "./components/Graph";
import DetailsPanel from "./components/DetailsPanel";
import StatsBar from "./components/StatsBar";
import Legend from "./components/Legend";
import FocusOverlay from "./components/FocusOverlay";
import type { GraphData } from "./types";

export default function App() {
  const setGraph = useStore((s) => s.setGraph);
  const graph = useStore((s) => s.graph);
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);

  useEffect(() => {
    fetch("/graph.json")
      .then((r) => {
        if (!r.ok) throw new Error(`graph.json: ${r.status}`);
        return r.json();
      })
      .then((data: GraphData) => setGraph(data))
      .catch((err) => console.error("Failed to load graph.json:", err));
  }, [setGraph]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focused) setFocused(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, setFocused]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      {graph ? (
        <Graph />
      ) : (
        <div className="flex h-full items-center justify-center text-ink-500">
          loading…
        </div>
      )}
      <StatsBar />
      <Legend />
      <FocusOverlay />
      <DetailsPanel />
    </div>
  );
}
