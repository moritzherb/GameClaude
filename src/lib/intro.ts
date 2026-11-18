/**
 * Opening the app: the home screen's apps and widgets settle into place as on a phone just unlocked,
 * coming in a little bigger and spread out from the middle, and gathering. Only when home is the
 * first screen, once per start; run on the phone's compositor (transform and opacity only).
 */
export function playIntro() {
  const home = document.querySelector<HTMLElement>('.os-home');
  if (!home || typeof home.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const items = [...home.querySelectorAll<HTMLElement>('.app, .widget')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < h && r.right > 0 && r.left < w;
  });
  const far = Math.hypot(w / 2, h / 2) || 1;
  for (const el of items) {
    const r = el.getBoundingClientRect();
    const dx = (r.left + r.width / 2 - w / 2) * 0.32;
    const dy = (r.top + r.height / 2 - h / 2) * 0.32;
    const delay = (Math.hypot(dx, dy) / 0.32 / far) * 60;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1.3)`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 520, delay, easing: 'cubic-bezier(0.2, 0.85, 0.25, 1.04)', fill: 'backwards' },
    );
  }
}
