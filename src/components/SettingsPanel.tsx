import { useState } from "react";
import { useStore } from "../store";
import {
  DEFAULT_SETTINGS,
  type AnimationSpeed,
  type FocusZoom,
  type LayoutDensity,
  type NeighborSpread,
  type NodeSize,
} from "../lib/settings";
import { LAYOUT_STORAGE_KEY, EDGE_TYPE_META } from "../lib/constants";
import type { EdgeType } from "../types";

const EDGE_ENTRIES = (Object.entries(EDGE_TYPE_META) as [EdgeType, typeof EDGE_TYPE_META[EdgeType]][]).map(
  ([type, { label, hex }]) => ({ type, label, color: hex }),
);

// ── Primitives ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent-gold" : "bg-ink-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-950 shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Steps<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-ink-700 text-xs">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 transition-colors ${
            i < options.length - 1 ? "border-r border-ink-700" : ""
          } ${
            opt.value === value ? "bg-ink-700 text-ink-100" : "text-ink-500 hover:text-ink-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Label-left, control-right row. All labels use the same style for consistency.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex-shrink-0 text-sm text-ink-100">{label}</span>
      {children}
    </div>
  );
}

// ── Step option lists ────────────────────────────────────────────────────────

const SPEED_OPTIONS = [
  { label: "Instant", value: "instant" as AnimationSpeed },
  { label: "Fast",    value: "fast"    as AnimationSpeed },
  { label: "Normal",  value: "normal"  as AnimationSpeed },
  { label: "Slow",    value: "slow"    as AnimationSpeed },
] as const;

const ZOOM_OPTIONS = [
  { label: "Close",  value: "close"  as FocusZoom },
  { label: "Normal", value: "normal" as FocusZoom },
  { label: "Far",    value: "far"    as FocusZoom },
] as const;

const SPREAD_OPTIONS = [
  { label: "Tight",  value: "tight"  as NeighborSpread },
  { label: "Normal", value: "normal" as NeighborSpread },
  { label: "Wide",   value: "wide"   as NeighborSpread },
] as const;

const DENSITY_OPTIONS = [
  { label: "Dense",  value: "dense"  as LayoutDensity },
  { label: "Normal", value: "normal" as LayoutDensity },
  { label: "Open",   value: "open"   as LayoutDensity },
  { label: "Sparse", value: "sparse" as LayoutDensity },
] as const;

const LABEL_SIZE_OPTIONS = [
  { label: "S", value: "small"  as NodeSize },
  { label: "M", value: "medium" as NodeSize },
  { label: "L", value: "large"  as NodeSize },
] as const;

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function toggleEdge(type: EdgeType) {
    updateSettings({
      edgeVisibility: { ...settings.edgeVisibility, [type]: !settings.edgeVisibility[type] },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-accent-paper">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">

          {/* Connection types
              TODO: add color selection per type using pre-selected color palettes
              (not a color wheel — a small set of curated color options per edge type,
              matching the accent.* colors in tailwind.config.js). */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wide text-ink-500">
              Connection types
            </div>
            <div className="space-y-2">
              {EDGE_ENTRIES.map(({ type, label, color }) => (
                <label key={type} className="flex cursor-pointer items-center gap-3">
                  <span
                    className="inline-block h-px w-5 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="flex-1 text-sm text-ink-100">{label}</span>
                  <Toggle
                    checked={settings.edgeVisibility[type]}
                    onChange={() => toggleEdge(type)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Primary */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wide text-ink-500">Audio</div>
            <Row label="Auto-play on focus">
              <Toggle
                checked={settings.audioAutoPlay}
                onChange={() => updateSettings({ audioAutoPlay: !settings.audioAutoPlay })}
              />
            </Row>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center gap-2 text-[11px] text-ink-600 transition-colors hover:text-ink-400"
          >
            <svg
              viewBox="0 0 12 12"
              className={`h-2.5 w-2.5 flex-shrink-0 transition-transform ${advancedOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 2l4 4-4 4" />
            </svg>
            <span>Advanced</span>
            <span className="flex-1 border-t border-ink-800" />
          </button>

          {/* Advanced body */}
          {advancedOpen && (
            <div className="space-y-4">
              {/* Focus */}
              <div className="space-y-2.5">
                <div className="text-[11px] uppercase tracking-wide text-ink-500">Focus</div>
                <Row label="Animation">
                  <Steps options={SPEED_OPTIONS} value={settings.animationSpeed} onChange={(v) => updateSettings({ animationSpeed: v })} />
                </Row>
                <Row label="Zoom">
                  <Steps options={ZOOM_OPTIONS} value={settings.focusZoom} onChange={(v) => updateSettings({ focusZoom: v })} />
                </Row>
                <Row label="Neighbor spread">
                  <Steps options={SPREAD_OPTIONS} value={settings.neighborSpread} onChange={(v) => updateSettings({ neighborSpread: v })} />
                </Row>
              </div>

              {/* Graph */}
              <div className="space-y-2.5">
                <div className="text-[11px] uppercase tracking-wide text-ink-500">Graph</div>
                <Row label="Layout">
                  <Steps options={DENSITY_OPTIONS} value={settings.layoutDensity} onChange={(v) => updateSettings({ layoutDensity: v })} />
                </Row>
                <Row label="Label size">
                  <Steps options={LABEL_SIZE_OPTIONS} value={settings.nodeSize} onChange={(v) => updateSettings({ nodeSize: v })} />
                </Row>
              </div>

              {/* Audio server URL — TODO: confusing for end users; needs cleanup.
                  See CLAUDE.md backlog for redesign options (port number, auto-detect, etc.). */}
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-ink-500">Audio server URL</div>
                <input
                  type="text"
                  value={settings.audioServerUrl}
                  onChange={(e) => updateSettings({ audioServerUrl: e.target.value })}
                  placeholder="default: /audio proxy → :5050"
                  spellCheck={false}
                  className="w-full rounded border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-xs text-ink-100 placeholder:text-ink-700 focus:border-ink-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap gap-2 border-t border-ink-800 pt-4">
            <button
              type="button"
              onClick={() => { localStorage.removeItem(LAYOUT_STORAGE_KEY); window.location.reload(); }}
              className="rounded border border-ink-700 px-3 py-1 text-xs text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100"
            >
              Reset positions
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ ...DEFAULT_SETTINGS })}
              className="rounded border border-ink-700 px-3 py-1 text-xs text-ink-400 transition-colors hover:border-ink-700 hover:text-accent-rose"
            >
              Reset all settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
