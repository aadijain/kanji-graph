import { useState } from "react";
import { SETTINGS_SECTIONS_KEY } from "../lib/constants";

export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
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

export function Steps<T extends string>({
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
            opt.value === value ? "bg-ink-700 text-primary" : "text-muted hover:text-secondary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex-shrink-0 text-sm text-primary">{label}</span>
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

export function Section({
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
        className="flex w-full items-center gap-2 text-xs text-muted transition-colors hover:text-secondary"
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
