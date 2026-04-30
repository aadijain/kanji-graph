import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import Graph from "./components/Graph";
import DetailsPanel from "./components/DetailsPanel";
import StatsBar from "./components/StatsBar";
import Legend from "./components/Legend";
import FocusOverlay from "./components/FocusOverlay";
import SearchOverlay from "./components/SearchOverlay";
import InfoModal from "./components/InfoModal";
import SettingsPanel from "./components/SettingsPanel";
import { playPronunciation } from "./lib/audio";
import type { GraphData } from "./types";

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function App() {
  const setGraph = useStore((s) => s.setGraph);
  const graph = useStore((s) => s.graph);
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  // Sync theme class to <html> so CSS variables flip.
  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, [settings.theme]);

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetch("/graph.json")
      .then((r) => {
        if (!r.ok) throw new Error(`graph.json: ${r.status}`);
        return r.json();
      })
      .then((data: GraphData) => setGraph(data))
      .catch((err) => console.error("Failed to load graph.json:", err));
  }, [setGraph]);

  // Handle hash changes in the same tab (e.g. user edits URL bar and presses Enter).
  useEffect(() => {
    const onHashChange = () => {
      const word = new URLSearchParams(window.location.hash.slice(1)).get("word") ?? "";
      const { graph, setFocused } = useStore.getState();
      if (!graph) return;
      if (word) {
        const node = graph.nodes.find((n) => n.word === word);
        if (node) setFocused(node);
      } else {
        setFocused(null);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Only strip the hash when exiting focus, not on initial mount with focused=null.
  const hadFocused = useRef(false);
  useEffect(() => {
    if (focused) {
      hadFocused.current = true;
      history.replaceState(null, "", "#word=" + encodeURIComponent(focused.word));
    } else if (hadFocused.current) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [focused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (infoOpen) { setInfoOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (focused) setFocused(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, setFocused, infoOpen, settingsOpen]);

  useEffect(() => {
    if (focused && settings.audioAutoPlay) {
      void playPronunciation(focused.word, focused.reading);
    }
  }, [focused?.id, focused?.word, focused?.reading, settings.audioAutoPlay]);

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
      <SearchOverlay blocked={infoOpen || settingsOpen} />
      <DetailsPanel />

      {/* Info / Settings / Theme buttons — bottom-right */}
      <div className="absolute bottom-6 right-6 flex gap-2">
        <button
          type="button"
          aria-label={settings.theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          onClick={() => updateSettings({ theme: settings.theme === "light" ? "dark" : "light" })}
          className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
        >
          {settings.theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => { setSettingsOpen(true); setInfoOpen(false); }}
          className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
        >
          <GearIcon />
        </button>
        <button
          type="button"
          aria-label="About"
          onClick={() => { setInfoOpen(true); setSettingsOpen(false); }}
          className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
        >
          <InfoIcon />
        </button>
      </div>

      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
