import { describe, expect, it } from 'vitest';
import { fold, searchGames } from './search';

const games = [
  { name: 'Kings Cup', more: ['Every card is a rule.', 'Cards'] },
  { name: 'Mäxchen', more: ['Two dice, one cup, a lot of lying.', 'Dice'] },
  { name: 'Princess/King Treatment', more: ['Bare Minimum or Princess Treatment?', 'Party'] },
  { name: 'Bus Driver', more: ['Guess your cards.', 'Cards'] },
];
const find = (q: string) => searchGames(q, games, (g) => [g.name, ...g.more]).map((g) => g.name);

describe('home search', () => {
  it('ignores case and umlauts', () => {
    expect(fold(' Mäxchen ')).toBe('maxchen');
    expect(find('max')).toEqual(['Mäxchen']);
  });

  it('puts names that start with it first, then names with it inside, then the rest', () => {
    expect(find('king')).toEqual(['Kings Cup', 'Princess/King Treatment']);
    expect(find('cup')).toEqual(['Kings Cup', 'Mäxchen']);
    expect(find('cards')).toEqual(['Kings Cup', 'Bus Driver']);
  });

  it('finds nothing for an empty search', () => {
    expect(find('  ')).toEqual([]);
    expect(find('zzz')).toEqual([]);
  });
});
