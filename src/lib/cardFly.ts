/**
 * Cards moving across the table, seen on every phone: one played lands where it now lies, coming from
 * where it was; copies (backs dealt or drawn, a trick taken) fly from one place to another and vanish.
 * Nothing moves for anyone who asked for less motion.
 */

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** An element just put down comes from `from` (a seat, a hand) to where it lies, settling into its own transform. */
export function flyIn(el: HTMLElement, from: DOMRect, duration = 380) {
  if (reducedMotion() || typeof el.animate !== 'function') return;
  const to = el.getBoundingClientRect();
  if (!to.width) return;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = Math.max(0.3, Math.min(1.4, from.width / to.width));
  const end = getComputedStyle(el).transform;
  el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(-6deg)` }, { transform: end === 'none' ? 'none' : end }], { duration, easing: EASE });
}

/**
 * A copy of `template` flies from `from` to `to` (shrinking or growing to its size) and is gone:
 * a back dealt to a seat, a card of a trick taken to its winner. Waits `delay` ms first.
 */
export function flyCopy(template: Element, from: DOMRect, to: DOMRect, { delay = 0, duration = 460, turn = 0 } = {}) {
  if (reducedMotion() || !from.width || !to.width) return;
  const el = template.cloneNode(true) as HTMLElement;
  el.removeAttribute('id');
  el.setAttribute('aria-hidden', 'true');
  el.classList.add('card-fly');
  Object.assign(el.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, transform: 'none' });
  document.body.appendChild(el);
  if (typeof el.animate !== 'function') return el.remove();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const s = Math.max(0.2, Math.min(1.5, Math.min(to.width / from.width, to.height / from.height)));
  const a = el.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${turn}deg)`, opacity: 1, offset: 0.86 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s * 0.94}) rotate(${turn}deg)`, opacity: 0 },
    ],
    { duration, delay, easing: EASE, fill: 'backwards' },
  );
  a.onfinish = a.oncancel = () => el.remove();
}

/**
 * Where the others sit: `n` places on an arc of the ellipse round (cx, cy), from `from` degrees
 * (your left; 180 is level with the middle) over the top to the same on your right, never below
 * `maxY`.
 */
export function seatArc(n: number, { cx, cy, rx, ry, from, maxY = Infinity }: { cx: number; cy: number; rx: number; ry: number; from: number; maxY?: number }) {
  const to = 180 - from;
  return Array.from({ length: n }, (_, k) => {
    const deg = n === 1 ? 90 : from - (k * (from - to)) / (n - 1);
    const a = (deg * Math.PI) / 180;
    return { x: Math.round(cx + rx * Math.cos(a)), y: Math.round(Math.min(maxY, cy - ry * Math.sin(a))) };
  });
}
