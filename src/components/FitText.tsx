import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * One line of text that gets a little smaller (down to `min` of its size) when it wouldn't fit its
 * box; only past that does it end in "…" (its class keeps the ellipsis). For a name like
 * "Maximilian" in a narrow tile.
 */
export default function FitText({ className, children, min = 0.8 }: { className?: string; children: ReactNode; min?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      if (!el.isConnected) return;
      el.style.fontSize = '';
      const over = el.scrollWidth / Math.max(1, el.clientWidth);
      if (over > 1.005) el.style.fontSize = `${Math.max(min, 1 / over - 0.01) * parseFloat(getComputedStyle(el).fontSize)}px`;
    };
    fit();
    // The tile changing width (turning the phone, a bigger screen), and the font arriving late.
    const watch = new ResizeObserver(fit);
    if (el.parentElement) watch.observe(el.parentElement);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => watch.disconnect();
  }, [children, min]);
  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
