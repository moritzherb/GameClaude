import { useMemo } from 'react';

/** Rising beer bubbles in the background. Pure CSS, zero effort for the phone. */
export default function Bubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        size: 10 + ((i * 13) % 34),
        duration: 9 + ((i * 7) % 11),
        delay: -((i * 3.7) % 16),
      })),
    [],
  );
  return (
    <div className="bubbles" aria-hidden>
      {bubbles.map((b, i) => (
        <span
          key={i}
          style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
        />
      ))}
    </div>
  );
}
