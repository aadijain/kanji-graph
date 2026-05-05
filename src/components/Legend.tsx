export default function Legend() {
  return (
    <div className="absolute bottom-6 left-6 rounded-md border border-ink-700 bg-ink-900/80 px-3 py-2 text-[11px] text-ink-300 backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-px w-6"
          style={{ background: "rgba(212, 168, 87, 0.85)" }}
        />
        <span>shared kanji</span>
      </div>
    </div>
  );
}
