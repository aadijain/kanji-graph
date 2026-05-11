import { useCallback, useEffect, useRef, useState } from "react";

export default function FpsOverlay() {
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
    <div className="pointer-events-none absolute right-6 top-2 z-10 rounded bg-ink-900/80 px-2 py-1 font-mono text-xs text-accent-paper">
      {fps} fps
    </div>
  );
}
