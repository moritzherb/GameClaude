/*
 * The app window's real height, for the CSS as --app-h (see global.css). On an iPhone home screen
 * 100vh/100dvh don't match it: under the old translucent status bar they came up short by the bar,
 * under the default one they take the bar in and every screen would scroll by that much. The
 * window's inner height is right either way.
 */
export function watchAppHeight() {
  const root = document.documentElement;
  let width = 0;
  const measure = () => {
    // The keyboard coming up (a field has the focus) isn't the window getting smaller.
    const field = document.activeElement;
    const typing = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;
    if (typing && window.innerWidth === width) return;
    if (window.innerHeight < 200) return;
    width = window.innerWidth;
    root.style.setProperty('--app-h', `${window.innerHeight}px`);
  };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('pageshow', measure);
}
