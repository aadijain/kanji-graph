import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import Graph from "./components/Graph";
import DetailsPanel from "./components/DetailsPanel";
import StatsBar from "./components/StatsBar";
import FocusHistory from "./components/FocusHistory";
import Legend from "./components/Legend";
import FocusOverlay from "./components/FocusOverlay";
import FpsOverlay from "./components/FpsOverlay";
import SearchOverlay from "./components/SearchOverlay";
import InfoModal from "./components/InfoModal";
import SettingsPanel from "./components/SettingsPanel";
import Toolbar from "./components/Toolbar";
import { playPronunciation } from "./lib/audio";
import { deinflect } from "./lib/deinflect";
import { BACK_STRIP_PANEL_LEFT } from "./lib/constants";
import type { GraphData } from "./types";

export default function App() {
  const setGraph = useStore((s) => s.setGraph);
  const graph = useStore((s) => s.graph);
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const settings = useStore((s) => s.settings);

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
      const candidates = deinflect(word);
      const node = candidates.reduce<(typeof g.nodes)[0] | undefined>(
        (found, c) => found ?? g.nodes.find((n) => n.word === c),
        undefined,
      );
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
        <div className="flex h-full items-center justify-center text-muted">
          loading…
        </div>
      )}
      <div style={{ left: focused ? BACK_STRIP_PANEL_LEFT : 24 }} className="absolute top-6 flex flex-col items-start gap-2 transition-all duration-200">
        <StatsBar />
        <FocusHistory />
      </div>
      <Legend />
      {settings.showFps && <FpsOverlay />}
      <FocusOverlay />
      <SearchOverlay blocked={infoOpen || settingsOpen} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <DetailsPanel />

      <Toolbar
        onSearch={() => { setSearchOpen(true); setInfoOpen(false); setSettingsOpen(false); }}
        onSettings={() => { setSettingsOpen(true); setInfoOpen(false); }}
        onInfo={() => { setInfoOpen(true); setSettingsOpen(false); }}
      />

      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
