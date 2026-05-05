export type Easing = (t: number) => number;

export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface TweenOpts {
  duration: number;
  easing?: Easing;
  onUpdate: (eased: number, raw: number) => void;
  onComplete?: () => void;
}

export function tween({ duration, easing = easeInOutCubic, onUpdate, onComplete }: TweenOpts) {
  const start = performance.now();
  let raf = 0;
  let cancelled = false;
  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    onUpdate(easing(t), t);
    if (t < 1) raf = requestAnimationFrame(step);
    else onComplete?.();
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
