/*
 * The game tables size what's on them from their own size. That used to be CSS container queries
 * (container-type and cqw/cqh units), but iPhones draw things inside such containers unreliably:
 * cards, buttons and labels vanish for a moment or for good, and the table lags. So each table's
 * size is measured here and handed to the CSS as plain pixels:
 *
 *   --qw / --qh    1% of the table's content width / height (what 1cqw / 1cqh meant inside it)
 *   --pqw / --pqh  the same for the table it sits in, or the screen (what they meant on the table
 *                  itself)
 *
 * Measured before the first picture is drawn (a mutation observer's callback runs before the
 * browser paints) and again whenever a table changes size.
 */

/** Tables that size things from their width and height (were `container-type: size`)… */
const SIZE_BOXES = [
  '.kc-stage',
  '.mx-table',
  '.kl-table',
  '.ftd-tablephone .ftd-table',
  '.fk-table',
  '.sp-middle',
  '.hs-track-wrap',
  '.hr-player .hr-felt',
  '.hr-decide',
  '.pl-felt',
  '.as-table',
  '.ar-table',
].join(',');
/** …and the ones that only size from their width (were `inline-size`): heights inside them still
 *  come from the table around them, so they hand on only --qw. Keep both in step with global.css. */
const WIDTH_BOXES = ['.kc-ring', '.ftd-pile', '.hs-bets', '.hs-track', '.pl-seat', '.ar-ring'].join(',');
export const BOX_SELECTOR = `${SIZE_BOXES},${WIDTH_BOXES}`;

const known = new WeakSet<Element>();
/** Elements with sizes set on them: one that's no longer a table (React reused it) loses them. */
const styled = new Set<HTMLElement>();
const VARS = ['--qw', '--qh', '--pqw', '--pqh'];

function contentBox(el: Element): { w: number; h: number } {
  if (!(el instanceof HTMLElement)) return { w: 0, h: 0 };
  const cs = getComputedStyle(el);
  return {
    w: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    h: el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  };
}

const px = (n: number) => `${Math.max(0, n / 100).toFixed(3)}px`;

function set(el: HTMLElement, name: string, value: string) {
  styled.add(el);
  if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}

/** Measure every table (outer ones first: the inner ones read their size). */
function measureAll() {
  const screen = { w: document.documentElement.clientWidth, h: window.innerHeight };
  for (const el of document.querySelectorAll<HTMLElement>(BOX_SELECTOR)) {
    // On the table itself: the size of the table around it (width: any; height: one with a height).
    const aroundW = el.parentElement?.closest(BOX_SELECTOR);
    const aroundH = el.parentElement?.closest(SIZE_BOXES);
    set(el, '--pqw', px(aroundW ? contentBox(aroundW).w : screen.w));
    set(el, '--pqh', px(aroundH ? contentBox(aroundH).h : screen.h));
    // Its own size can depend on those (the Kings Cup ring), so it's read after they're set.
    const own = contentBox(el);
    set(el, '--qw', px(own.w));
    if (el.matches(SIZE_BOXES)) set(el, '--qh', px(own.h));
    else el.style.removeProperty('--qh');
  }
}

export function watchBoxes() {
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;
  const resize = new ResizeObserver(measureAll);
  const scan = () => {
    for (const el of styled) {
      if (el.isConnected && el.matches(BOX_SELECTOR)) continue;
      VARS.forEach((v) => el.style.removeProperty(v));
      styled.delete(el);
    }
    let found = false;
    for (const el of document.querySelectorAll(BOX_SELECTOR)) {
      if (known.has(el)) continue;
      known.add(el);
      resize.observe(el);
      found = true;
    }
    // New tables: their sizes are in before the browser draws them.
    if (found) measureAll();
  };
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', measureAll);
  scan();
}
