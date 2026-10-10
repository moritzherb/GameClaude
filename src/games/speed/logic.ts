import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/*
 * Speed – rules
 * - Two players get 20 cards each as a face-down pile; the other 12 go into two side stacks of 6.
 * - You may hold at most 5 cards. Draw from your pile whenever you like; draw more than 5 and you
 *   have to put the extras back (last one first, so the pile is in order again) before you can play.
 * - On 1-2-3 a card from each side stack is turned over into the middle: two piles to play on.
 * - Both play at the same time: a card goes on a middle pile if it's one higher or lower.
 *   Aces wrap around: an Ace goes on a King or a 2, a 2 on an Ace or a 3.
 * - When neither player can play (hands full or piles empty), two new cards are turned over.
 *   Once the side stacks are used up, every card in the middle is shuffled into two new side stacks
 *   and play goes on.
 * - The first to get rid of every card wins.
 */

export const HAND_MAX = 5;
export const PILE = 20;

export interface Side {
  /** Face-down, top card first. */
  pile: Card[];
  /** In the order drawn: anything past the 5th was drawn too many. */
  hand: Card[];
}

export interface Game {
  sides: [Side, Side];
  /** The two stacks the middle cards are turned over from (top card first). */
  stacks: [Card[], Card[]];
  /** The two piles in the middle (top card last). */
  middle: [Card[], Card[]];
  /** ready: before the first turn-over; count: 3-2-1 running; play: go! */
  phase: 'ready' | 'count' | 'play' | 'over';
  ready: [boolean, boolean];
  winner: 0 | 1 | null;
}

export type Who = 0 | 1;

export function newGame(deck: Card[] = shuffle(newDeck())): Game {
  const pile0 = deck.slice(0, PILE);
  const pile1 = deck.slice(PILE, PILE * 2);
  const rest = deck.slice(PILE * 2);
  // Everyone picks up their first five right away.
  return {
    sides: [
      { pile: pile0.slice(HAND_MAX), hand: pile0.slice(0, HAND_MAX) },
      { pile: pile1.slice(HAND_MAX), hand: pile1.slice(0, HAND_MAX) },
    ],
    stacks: [rest.slice(0, rest.length / 2), rest.slice(rest.length / 2)],
    middle: [[], []],
    phase: 'ready',
    ready: [false, false],
    winner: null,
  };
}

/** One up or down, round the corner: K-A-2. */
export function fits(card: Card, onto: Card | undefined) {
  if (!onto) return false;
  const d = (card.value - onto.value + 13) % 13;
  return d === 1 || d === 12;
}

const tops = (g: Game) => [g.middle[0].at(-1), g.middle[1].at(-1)] as const;

/** Drew more than 5: has to put cards back before playing on. */
export const overDrawn = (s: Side) => s.hand.length > HAND_MAX;

/** Which middle pile this card can go on (the left one if both), or null. */
export function targetFor(g: Game, card: Card): 0 | 1 | null {
  const [a, b] = tops(g);
  return fits(card, a) ? 0 : fits(card, b) ? 1 : null;
}

const setSide = (g: Game, who: Who, side: Side): [Side, Side] => (who === 0 ? [side, g.sides[1]] : [g.sides[0], side]);

export function markReady(g: Game, who: Who): Game {
  if (g.phase !== 'ready') return g;
  const ready: [boolean, boolean] = who === 0 ? [true, g.ready[1]] : [g.ready[0], true];
  return { ...g, ready, phase: ready[0] && ready[1] ? 'count' : 'ready' };
}

/** Take the top card of your pile into your hand (even past 5 – then it has to go back). */
export function draw(g: Game, who: Who): Game {
  const s = g.sides[who];
  if (g.phase === 'over' || !s.pile.length) return g;
  return { ...g, sides: setSide(g, who, { pile: s.pile.slice(1), hand: [...s.hand, s.pile[0]] }) };
}

/** Sort your hand from low to high (2 … Ace). Not while you hold too many: they go back in order first. */
export function sortHand(g: Game, who: Who): Game {
  const s = g.sides[who];
  if (overDrawn(s)) return g;
  const hand = [...s.hand].sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit));
  if (hand.every((c, i) => c === s.hand[i])) return g;
  return { ...g, sides: setSide(g, who, { ...s, hand }) };
}

/** Put the last drawn extra card back on top of your pile. */
export function putBack(g: Game, who: Who): Game {
  const s = g.sides[who];
  if (!overDrawn(s)) return g;
  return { ...g, sides: setSide(g, who, { pile: [s.hand[s.hand.length - 1], ...s.pile], hand: s.hand.slice(0, -1) }) };
}

/** Play a card from your hand onto a middle pile (the given one, or whichever fits). */
export function play(g: Game, who: Who, index: number, onto?: 0 | 1): Game {
  const s = g.sides[who];
  const card = s.hand[index];
  if (g.phase !== 'play' || !card || overDrawn(s)) return g;
  const target = onto ?? targetFor(g, card);
  if (target == null || !fits(card, g.middle[target].at(-1))) return g;
  const side = { pile: s.pile, hand: s.hand.filter((_, i) => i !== index) };
  const middle: [Card[], Card[]] = target === 0 ? [[...g.middle[0], card], g.middle[1]] : [g.middle[0], [...g.middle[1], card]];
  const done = !side.hand.length && !side.pile.length;
  return { ...g, sides: setSide(g, who, side), middle, phase: done ? 'over' : g.phase, winner: done ? who : g.winner };
}

/** Can this player do nothing useful: nothing fits, and drawing more isn't allowed or possible? */
export function blocked(g: Game, who: Who) {
  const s = g.sides[who];
  if (overDrawn(s)) return false;
  if (s.hand.some((c) => targetFor(g, c) != null)) return false;
  return s.hand.length >= HAND_MAX || !s.pile.length;
}

/** Both players stuck: time to turn over two new middle cards. */
export const stuck = (g: Game) => g.phase === 'play' && blocked(g, 0) && blocked(g, 1);

/** 1-2-3: turn a card from each side stack onto the middle. Once the stacks are empty, every card in the middle is shuffled into two new ones first. */
export function turnOver(g: Game, rand: <T>(items: readonly T[]) => T[] = shuffle): Game {
  let { stacks, middle } = g;
  if (!stacks[0].length || !stacks[1].length) {
    const all = rand([...middle[0], ...middle[1], ...stacks[0], ...stacks[1]]);
    const half = Math.ceil(all.length / 2);
    stacks = [all.slice(0, half), all.slice(half)];
    middle = [[], []];
  }
  const nextMiddle: [Card[], Card[]] = [
    stacks[0].length ? [...middle[0], stacks[0][0]] : middle[0],
    stacks[1].length ? [...middle[1], stacks[1][0]] : middle[1],
  ];
  return { ...g, stacks: [stacks[0].slice(1), stacks[1].slice(1)], middle: nextMiddle, phase: 'play' };
}

/** Every card is somewhere, exactly once (for tests). */
export const allCards = (g: Game) => [...g.sides.flatMap((s) => [...s.pile, ...s.hand]), ...g.stacks.flat(), ...g.middle.flat()];
