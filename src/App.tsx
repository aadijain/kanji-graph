import { useEffect, useRef, useState, useCallback } from "react";
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

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-800 px-2 py-1 text-xs text-ink-200 opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FpsOverlay() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef(0);

  const tick = useCallback(() => {
    frameCount.current += 1;
    const now = performance.now();
    const elapsed = now - lastTime.current;
    if (elapsed >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / elapsed));
      frameCount.current = 0;
      lastTime.current = now;
    }
    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [tick]);

  return (
    <div className="pointer-events-none absolute right-6 top-2 z-10 rounded bg-ink-900/80 px-2 py-1 font-mono text-[11px] text-accent-paper">
      {fps} fps
    </div>
  );
}

function FitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export default function App() {
  const setGraph = useStore((s) => s.setGraph);
  const graph = useStore((s) => s.graph);
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const resetZoom = useStore((s) => s.resetZoom);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  // Sync theme class to <html> so CSS variables flip.
  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, [settings.theme]);

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    // Capture initial #word=... hash before any graph is loaded; Graph.tsx will
    // apply it once node positions are available.
    const initialWord = new URLSearchParams(window.location.hash.slice(1)).get("word") ?? "";
    if (initialWord) useStore.getState().setPendingFocusWord(initialWord);

    const ac = new AbortController();
    fetch("/graph.json", { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`graph.json: ${r.status}`);
        return r.json();
      })
      .then((data: GraphData) => {
        if (useStore.getState().graph) return;
        setGraph(data);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Failed to load graph.json:", err);
      });
    return () => ac.abort();
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

  const lastClipboardWord = useRef("");
  useEffect(() => {
    if (!settings.clipboardSyncEnabled) return;

    function focusWord(word: string) {
      if (!word || word === lastClipboardWord.current) return;
      lastClipboardWord.current = word;
      const { graph: g, setFocused: sf } = useStore.getState();
      if (!g) return;
      const node = g.nodes.find((n) => n.word === word);
      if (node) sf(node);
    }

    // Paste (Ctrl+V) — works on HTTP, no permission needed.
    // Skip if the event target is a text input (e.g. search box).
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const word = e.clipboardData?.getData("text/plain").trim() ?? "";
      focusWord(word);
    };

    // Tab-switch clipboard read — only works on HTTPS / localhost.
    const tryClipboard = async () => {
      if (document.hidden) return;
      try {
        const word = (await navigator.clipboard.readText()).trim();
        focusWord(word);
      } catch { /* HTTP or permission denied — silently ignore */ }
    };
    const onVisibility = () => { if (!document.hidden) void tryClipboard(); };

    document.addEventListener("paste", onPaste);
    window.addEventListener("focus", tryClipboard);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("focus", tryClipboard);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [settings.clipboardSyncEnabled]);

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
      {settings.showFps && <FpsOverlay />}
      <FocusOverlay />
      <SearchOverlay blocked={infoOpen || settingsOpen} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <DetailsPanel />

      {/* Info / Settings / Theme buttons — bottom-right */}
      <div className="absolute bottom-6 right-6 flex gap-2">
        {graph && (
          <Tooltip label="Search">
            <button
              type="button"
              aria-label="Search"
              onClick={() => { setSearchOpen(true); setInfoOpen(false); setSettingsOpen(false); }}
              className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
            >
              <SearchIcon />
            </button>
          </Tooltip>
        )}
        {graph && (
          <Tooltip label="Random word">
            <button
              type="button"
              aria-label="Random word"
              onClick={() => {
                const nodes = graph.nodes;
                setFocused(nodes[Math.floor(Math.random() * nodes.length)]);
              }}
              className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
            >
              <ShuffleIcon />
            </button>
          </Tooltip>
        )}
        {graph && (
          <Tooltip label="Reset zoom">
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={() => resetZoom?.()}
              className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
            >
              <FitIcon />
            </button>
          </Tooltip>
        )}
        <Tooltip label={settings.theme === "light" ? "Dark mode" : "Light mode"}>
          <button
            type="button"
            aria-label={settings.theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            onClick={() => updateSettings({ theme: settings.theme === "light" ? "dark" : "light" })}
            className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
          >
            {settings.theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </Tooltip>
        <Tooltip label="Settings">
          <button
            type="button"
            aria-label="Settings"
            onClick={() => { setSettingsOpen(true); setInfoOpen(false); }}
            className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
          >
            <GearIcon />
          </button>
        </Tooltip>
        <Tooltip label="About">
          <button
            type="button"
            aria-label="About"
            onClick={() => { setInfoOpen(true); setSettingsOpen(false); }}
            className="rounded-md border border-ink-700 bg-ink-900 p-2 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
          >
            <InfoIcon />
          </button>
        </Tooltip>
      </div>

      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
