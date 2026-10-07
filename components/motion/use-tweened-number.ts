"use client";

import { useEffect, useRef, useState } from "react";

// Glides a displayed number to its new value over a short time instead of
// jumping (e.g. the What if? score while a slider moves). Plain
// requestAnimationFrame, no library; for reduced motion it jumps straight
// to the new value.
export function useTweenedNumber(target: number, durationMs = 300): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    // Reduced motion: a zero-length tween, i.e. jump on the next frame.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : durationMs;
    const startValue = from.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const value = startValue + (target - startValue) * (1 - Math.pow(1 - t, 3));
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}
