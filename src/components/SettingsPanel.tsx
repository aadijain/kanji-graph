import { useState, useEffect } from "react";
import { useStore } from "../store";
import {
  DEFAULT_SETTINGS,
  type AnimationSpeed,
  type FocusZoom,
  type LayoutDensity,
  type NeighborSpread,
  type NodeSize,
} from "../lib/settings";
import { LAYOUT_STORAGE_KEY, EDGE_ENTRIES, EDGE_COLOR_SWATCHES, SETTINGS_SECTIONS_KEY } from "../lib/constants";
import type { EdgeType } from "../types";
import CloseButton from "./CloseButton";

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
        className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-ink-950 shadow transition-transform ${
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex-shrink-0 text-sm text-ink-100">{label}</span>
      {children}
    </div>
  );
}

function getSectionOpen(id: string): boolean {
  try {
    const stored = localStorage.getItem(SETTINGS_SECTIONS_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed[id] === true;
  } catch {
    return false;
  }
}

function setSectionOpen(id: string, open: boolean) {
  try {
    const stored = localStorage.getItem(SETTINGS_SECTIONS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    localStorage.setItem(SETTINGS_SECTIONS_KEY, JSON.stringify({ ...parsed, [id]: open }));
  } catch {
    // ignore
  }
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = title.toLowerCase().replace(/\s+/g, "-");
  const [open, setOpen] = useState(() => getSectionOpen(id));

  function toggle() {
    setOpen((o) => {
      setSectionOpen(id, !o);
      return !o;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 text-[11px] text-ink-500 transition-colors hover:text-ink-300"
      >
        <svg
          viewBox="0 0 12 12"
          className={`h-2.5 w-2.5 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        <span className="uppercase tracking-wide">{title}</span>
        <span className="flex-1 border-t border-ink-800" />
      </button>
      {open && <div className="mt-2.5 space-y-2.5">{children}</div>}
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

type ClipboardPermState = "granted" | "denied" | "prompt" | "unavailable";

async function queryClipboardPerm(): Promise<ClipboardPermState> {
  try {
    const result = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    return result.state as ClipboardPermState;
  } catch {
    return "unavailable";
  }
}

export default function SettingsPanel({ onClose }: Props) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [clipboardPerm, setClipboardPerm] = useState<ClipboardPermState | null>(null);

  useEffect(() => {
    if (settings.clipboardSyncEnabled) {
      void queryClipboardPerm().then(setClipboardPerm);
    } else {
      setClipboardPerm(null);
    }
  }, [settings.clipboardSyncEnabled]);

  function toggleEdge(type: EdgeType) {
    updateSettings({
      edgeVisibility: { ...settings.edgeVisibility, [type]: !settings.edgeVisibility[type] },
    });
  }

  function setEdgeColor(type: EdgeType, hex: string) {
    updateSettings({
      edgeColors: { ...settings.edgeColors, [type]: hex },
    });
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-800 px-6 py-3.5">
          <h2 className="text-sm font-semibold text-accent-paper">Settings</h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-4">

          {/* Connection types */}
          <Section title="Connection types">
            {EDGE_ENTRIES.map(([type, { label }]) => {
              const activeColor = settings.edgeColors[type];
              return (
                <div key={type} className="flex items-center gap-3">
                  <span
                    className="inline-block h-px w-5 flex-shrink-0"
                    style={{ background: activeColor }}
                  />
                  <span className="flex-1 text-sm text-ink-100">{label}</span>
                  <div className="flex gap-1">
                    {EDGE_COLOR_SWATCHES.map(({ hex }) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setEdgeColor(type, hex)}
                        aria-label={hex}
                        className={`h-3.5 w-3.5 flex-shrink-0 rounded-full transition-opacity ${
                          activeColor === hex
                            ? "ring-1 ring-ink-300 ring-offset-1 ring-offset-ink-900"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{ background: hex }}
                      />
                    ))}
                  </div>
                  <Toggle
                    checked={settings.edgeVisibility[type]}
                    onChange={() => toggleEdge(type)}
                  />
                </div>
              );
            })}
          </Section>

          {/* Audio */}
          <Section title="Audio">
            <Row label="Auto-play on focus">
              <Toggle
                checked={settings.audioAutoPlay}
                onChange={() => updateSettings({ audioAutoPlay: !settings.audioAutoPlay })}
              />
            </Row>
            <Row label="Local audio server">
              <Toggle
                checked={settings.localAudioEnabled}
                onChange={() => updateSettings({ localAudioEnabled: !settings.localAudioEnabled })}
              />
            </Row>
            {settings.localAudioEnabled && (
              <input
                type="text"
                value={settings.audioServerUrl}
                onChange={(e) => updateSettings({ audioServerUrl: e.target.value })}
                placeholder="http://127.0.0.1:5050/?term={term}&reading={reading}"
                spellCheck={false}
                className="w-full rounded border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-xs text-ink-100 placeholder:text-ink-700 focus:border-ink-500 focus:outline-none"
              />
            )}
          </Section>

          {/* Clipboard */}
          <Section title="Clipboard">
            <Row label="Follow clipboard">
              <Toggle
                checked={settings.clipboardSyncEnabled}
                onChange={async () => {
                  const enabling = !settings.clipboardSyncEnabled;
                  if (enabling) {
                    try {
                      await navigator.clipboard.readText();
                    } catch { /* permission denied or unsupported — feature still toggles on */ }
                    setClipboardPerm(await queryClipboardPerm());
                  }
                  updateSettings({ clipboardSyncEnabled: enabling });
                }}
              />
            </Row>
            {settings.clipboardSyncEnabled && clipboardPerm !== null && (
              <p className="text-xs text-ink-500">
                {clipboardPerm === "granted"
                  ? "Tab-switch detection active."
                  : clipboardPerm === "denied"
                  ? "Clipboard access denied - use Ctrl+V to focus a word."
                  : "Tab-switch detection unavailable in this browser - use Ctrl+V to focus a word."}
              </p>
            )}
          </Section>

          {/* Focus */}
          <Section title="Focus">
            <Row label="Animation">
              <Steps options={SPEED_OPTIONS} value={settings.animationSpeed} onChange={(v) => updateSettings({ animationSpeed: v })} />
            </Row>
            <Row label="Zoom">
              <Steps options={ZOOM_OPTIONS} value={settings.focusZoom} onChange={(v) => updateSettings({ focusZoom: v })} />
            </Row>
            <Row label="Neighbor spread">
              <Steps options={SPREAD_OPTIONS} value={settings.neighborSpread} onChange={(v) => updateSettings({ neighborSpread: v })} />
            </Row>
          </Section>

          {/* Graph */}
          <Section title="Graph">
            <Row label="Layout">
              <Steps options={DENSITY_OPTIONS} value={settings.layoutDensity} onChange={(v) => updateSettings({ layoutDensity: v })} />
            </Row>
            <Row label="Label size">
              <Steps options={LABEL_SIZE_OPTIONS} value={settings.nodeSize} onChange={(v) => updateSettings({ nodeSize: v })} />
            </Row>
            <Row label="Scale dots by frequency">
              <Toggle
                checked={settings.nodeSizeByFrequency}
                onChange={() => updateSettings({ nodeSizeByFrequency: !settings.nodeSizeByFrequency })}
              />
            </Row>
            <Row label="Focus history trail">
              <Toggle
                checked={settings.showFocusHistory}
                onChange={() => updateSettings({ showFocusHistory: !settings.showFocusHistory })}
              />
            </Row>
            <Row label="FPS counter">
              <Toggle
                checked={settings.showFps}
                onChange={() => updateSettings({ showFps: !settings.showFps })}
              />
            </Row>
          </Section>

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
