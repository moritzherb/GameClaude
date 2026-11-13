import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { SortIcon } from './Icons';

/** Where each card of a fan of `n` lies, `width` wide: along an arc, each a little turned, the
 *  outer ones' turned corners still inside. `card` wide, `ratio` times as tall. */
export function fanLayout(n: number, width: number, card: number, ratio = 1.5) {
  if (n <= 0) return { spots: [], depth: 0 };
  const rad = (d: number) => (d * Math.PI) / 180;
  const da = n > 1 ? Math.min(7, 36 / (n - 1)) : 0;
  const outer = rad((da * (n - 1)) / 2);
  const h = card * ratio;
  // How far out the outermost card's foot may stand: its top corner turned out must still fit.
  const reach = Math.max(0, width / 2 - h * Math.sin(outer) - (card / 2) * Math.cos(outer));
  const dx = n > 1 ? Math.min(card * 0.6, reach / ((n - 1) / 2)) : 0;
  // The circle the cards' feet sit on: as wide as their spacing and turn make it.
  const r = da > 0 ? dx / Math.sin(rad(da)) : 0;
  const spots = Array.from({ length: n }, (_, i) => {
    const c = i - (n - 1) / 2;
    const a = c * da;
    return { x: c * dx, y: r * (1 - Math.cos(rad(a))), a };
  });
  // How far below the middle card's foot the lowest corner goes.
  const depth = r * (1 - Math.cos(outer)) + (card / 2) * Math.sin(outer);
  return { spots, depth };
}

/**
 * Your cards held as in your hand: a fan along an arc, the first on the left, each a little turned,
 * overlapping as much as the screen needs (a fat hand fans tighter). What renders each card is the
 * game's; the round button beside it sorts the hand (or leaves it as dealt).
 */
export default function HandFan<T>({
  cards,
  keyOf,
  card: render,
  width = 64,
  ratio = 1.5,
  sorted,
  onSort,
  label,
  className = '',
}: {
  cards: T[];
  keyOf: (c: T) => string | number;
  card: (c: T) => ReactNode;
  /** A card's width (px) and height to width. */
  width?: number;
  ratio?: number;
  sorted?: boolean;
  onSort?: () => void;
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(320);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setRoom(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { spots, depth } = fanLayout(cards.length, room, width, ratio);
  return (
    <div className={`fan-row ${className}`}>
      <div ref={box} className="fan" aria-label={label} style={{ '--cw': `${width}px`, height: Math.round(width * ratio + depth + 20) } as CSSProperties}>
        {cards.map((c, i) => {
          const s = spots[i];
          return (
            <div key={keyOf(c)} className="fan-slot" style={{ transform: `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) rotate(${s.a.toFixed(2)}deg)` }}>
              {render(c)}
            </div>
          );
        })}
      </div>
      {onSort && (
        <SortButton
          on={!!sorted}
          onClick={() => {
            sfx.tick();
            buzz(10);
            onSort();
          }}
        />
      )}
    </div>
  );
}

/** The small round button that sorts a hand: filled while the hand is kept sorted (`on`; leave it
 *  out for a button that sorts once). */
export function SortButton({ on, disabled, onClick }: { on?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`sort-btn${on ? ' on' : ''}`} aria-pressed={on} aria-label={t('Sort your cards')} disabled={disabled} onClick={onClick}>
      <SortIcon />
    </button>
  );
}
