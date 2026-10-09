import { describe, expect, it } from 'vitest';
import { newDeck, type Card, type Suit } from '../../lib/cards';
import { behind, newRace, step, type Race } from './logic';

const c = (suit: Suit, value = 5): Card => ({ value, suit });

/** A race with the given side cards and deck (top first). */
function race(side: Card[], deck: Card[]): Race {
  const r = newRace(side.length, newDeck());
  return { ...r, side: side.map((card) => ({ card, open: false })), deck };
}

describe('Horse race', () => {
  it('sets up the Aces at the start, one side card per row and the rest as the deck', () => {
    const r = newRace(6, newDeck());
    expect(r.side).toHaveLength(6);
    expect(r.deck).toHaveLength(52 - 4 - 6);
    expect([...r.side.map((s) => s.card), ...r.deck].some((x) => x.value === 14)).toBe(false);
    expect(Object.values(r.pos)).toEqual([0, 0, 0, 0]);
  });

  it('a card moves the Ace of its suit up one row', () => {
    const r = step(race([c('clubs'), c('clubs'), c('clubs')], [c('hearts'), c('hearts')]));
    expect(r.pos.hearts).toBe(1);
    expect(r.last).toEqual({ kind: 'draw', card: c('hearts') });
  });

  it('the first Ace into a row turns its side card over before the next deck card', () => {
    let r = race([c('spades'), c('clubs'), c('clubs')], [c('hearts'), c('diamonds')]);
    r = step(r); // hearts to row 1 → side card of row 1 waits
    expect(r.queue).toEqual([{ row: 1, by: 'hearts' }]);
    r = step(r); // the side card (spades) is turned over, spades moves up
    expect(r.last).toEqual({ kind: 'side', card: c('spades'), row: 1, by: 'hearts' });
    expect(r.side[0].open).toBe(true);
    expect(r.pos.spades).toBe(1);
    // Spades reached row 1 too, but that card is already open: nothing new waits.
    expect(r.queue).toEqual([]);
    r = step(r);
    expect(r.last).toEqual({ kind: 'draw', card: c('diamonds') });
  });

  it('side cards can chain', () => {
    // Hearts reaches row 1 → side card is hearts → hearts reaches row 2 → its side card turns too.
    let r = race([c('hearts'), c('clubs'), c('clubs')], [c('hearts'), c('diamonds')]);
    r = step(step(step(r)));
    expect(r.pos.hearts).toBe(2);
    expect(r.pos.clubs).toBe(1);
    expect(r.log.map((s) => s.kind)).toEqual(['draw', 'side', 'side']);
  });

  it('the first Ace past the top row wins; the others are behind by their distance', () => {
    let r = race([c('clubs', 2)], [c('hearts'), c('hearts'), c('hearts')]);
    r = step(r); // hearts row 1
    r = step(r); // side: clubs row 1
    r = step(r); // hearts past the finish (2 rows: 1 + finish)
    expect(r.winner).toBe('hearts');
    expect(behind(r, 'clubs')).toBe(1);
    expect(behind(r, 'spades')).toBe(2);
    expect(step(r)).toBe(r);
  });

  it('a whole race always ends with a winner', () => {
    for (const rows of [5, 6, 7, 8]) {
      let r = newRace(rows);
      for (let i = 0; i < 200 && !r.winner; i++) r = step(r);
      expect(r.winner).not.toBeNull();
    }
  });
});
