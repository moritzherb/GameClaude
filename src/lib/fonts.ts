/**
 * The app's type right now, for text drawn on a canvas (CSS sets it: SF Pro with the iPhone set,
 * Roboto with Android, the classic look its own).
 */
export function appFont(role: 'display' | 'body' = 'body') {
  if (typeof document === 'undefined') return 'sans-serif';
  return getComputedStyle(document.documentElement).getPropertyValue(`--font-${role}`).trim() || 'sans-serif';
}

/**
 * Resolves once the app's type can be drawn: a face that comes with the app (Roboto) may still be
 * loading when a canvas first paints, and the canvas would keep the stand-in.
 */
export function fontsReady(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts?.load) return Promise.resolve();
  return Promise.all([fonts.load(`900 40px ${appFont('display')}`), fonts.load(`700 20px ${appFont('body')}`)]).then(
    () => undefined,
    () => undefined,
  );
}
