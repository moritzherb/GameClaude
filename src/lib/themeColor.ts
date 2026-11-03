/** The ground colour of each look (light, dark): the browser's bar and the strip under the clock take it. */
export const GROUND = { pop: ['#ece8dd', '#20211c'], classic: ['#f1ede3', '#10110e'] } as const;

/** Colour the browser's bar and the strip under the clock (light mode, dark mode). */
export function setThemeColor(light: string, dark: string) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = m.media.includes('dark') ? dark : light));
}
