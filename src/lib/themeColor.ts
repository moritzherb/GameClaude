/** The ground colour of each look (light, dark): the browser's bar and the strip under the clock take it. */
export const GROUND = { pop: ['#ece8dd', '#20211c'], classic: ['#f1ede3', '#10110e'] } as const;

/** Light or dark chosen in Settings (null: as the phone is). */
let forced: 'light' | 'dark' | null = null;
let pair: [string, string] = [GROUND.pop[0], GROUND.pop[1]];

function paint() {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const dark = forced ? forced === 'dark' : m.media.includes('dark');
    m.content = dark ? pair[1] : pair[0];
  });
}

/** Colour the browser's bar and the strip under the clock (light mode, dark mode). */
export function setThemeColor(light: string, dark: string) {
  pair = [light, dark];
  paint();
}

/** Light or dark as chosen in Settings: the page (html[data-theme]) and the bars follow. */
export function setTheme(theme: 'light' | 'dark' | null) {
  forced = theme;
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  paint();
}
