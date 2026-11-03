/** Lower case, without accents or umlaut dots: "Mäxchen" is found by "max". */
export function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * The games a search finds, best first: names that start with it, then names that contain it,
 * then games whose words (tagline, kinds) contain it. `words` gives each game's texts, already
 * translated: the name first.
 */
export function searchGames<G>(query: string, games: G[], words: (g: G) => string[]): G[] {
  const q = fold(query);
  if (!q) return [];
  const scored = games
    .map((g, i) => {
      const [name, ...rest] = words(g).map(fold);
      const score = name.startsWith(q) || name.split(/[\s/]+/).some((w) => w.startsWith(q)) ? 0 : name.includes(q) ? 1 : rest.some((w) => w.includes(q)) ? 2 : -1;
      return { g, i, score };
    })
    .filter((x) => x.score >= 0);
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((x) => x.g);
}
