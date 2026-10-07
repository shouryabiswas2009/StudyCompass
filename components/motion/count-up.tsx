"use client";

import { useEffect, useRef, useState } from "react";

// A number that counts up from 0 to its real value the first time it
// scrolls into view. The server sends the real value, so the page is
// correct without JavaScript; the count only runs if the number started
// off-screen (so it never flashes down to 0 in front of the reader), and
// never for people who ask for reduced motion.
export function CountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return; // already visible: leave the real number

    // Off-screen: start from 0 now, while nobody can see it change.
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3); // fast start, gentle finish
        setShown(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("en-US")}
    </span>
  );
}
