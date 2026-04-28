const ENTRIES: { color: string; label: string }[] = [
  { color: "rgba(212, 168, 87, 0.85)", label: "shared kanji" },
  { color: "rgba(122, 168, 217, 0.85)", label: "same reading" },
  { color: "rgba(168, 128, 212, 0.85)", label: "similar kanji" },
];

export default function Legend() {
  return (
    <div className="absolute bottom-6 left-6 rounded-md border border-ink-700 bg-ink-900/80 px-3 py-2 text-[11px] text-ink-300 backdrop-blur">
      <div className="space-y-1">
        {ENTRIES.map((e) => (
          <div key={e.label} className="flex items-center gap-2">
            <span className="inline-block h-px w-6" style={{ background: e.color }} />
            <span>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
