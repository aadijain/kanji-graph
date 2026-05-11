import { useStore } from "../store";
import { graphRef } from "../lib/graphRef";

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

interface ToolbarProps {
  onSearch: () => void;
  onSettings: () => void;
  onInfo: () => void;
}

export default function Toolbar({ onSearch, onSettings, onInfo }: ToolbarProps) {
  const graph = useStore((s) => s.graph);
  const setFocused = useStore((s) => s.setFocused);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="absolute bottom-6 right-6 flex gap-2">
      {graph && (
        <Tooltip label="Search">
          <button
            type="button"
            aria-label="Search"
            onClick={onSearch}
            className="btn-icon"
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
            className="btn-icon"
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
            onClick={() => graphRef.resetZoom?.()}
            className="btn-icon"
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
          className="btn-icon"
        >
          {settings.theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </Tooltip>
      <Tooltip label="Settings">
        <button
          type="button"
          aria-label="Settings"
          onClick={onSettings}
          className="btn-icon"
        >
          <GearIcon />
        </button>
      </Tooltip>
      <Tooltip label="About">
        <button
          type="button"
          aria-label="About"
          onClick={onInfo}
          className="btn-icon"
        >
          <InfoIcon />
        </button>
      </Tooltip>
    </div>
  );
}
