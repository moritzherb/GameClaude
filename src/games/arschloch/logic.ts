import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/*
 * Arschloch – rules
 * - 32 cards (7 to Ace), face down in a circle on the table; the pile goes in the middle.
 * - On your turn, with no cards in your hand, draw one from the circle and look at it (nobody
 *   else may). With cards in your hand, play one of those instead: you may only draw again once
 *   your hand is empty.
 * - Play it face down on the pile and say what it is: the same value as the card before or higher.
 *   You may lie.
 * - Before playing, and only then, the next player may turn the card before over. A lie: the liar
 *   takes the whole pile. The truth: whoever turned it over takes the pile. Either way they drink a
 *   sip per card taken, and whoever turned it over carries on (with a fresh pile: anything goes).
 * - Four of a value in your hand go out of the game, face down beside it; whoever lays them down
 *   hands out 2 sips.
 * - Four Jacks in your hand: you're the Arschloch. Empty your glass, the game is over.
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const LOWEST = 7;
export const ACE = 14;
export const JACK = 11;
/** Sips handed out for four of a kind laid down. */
export const QUAD_SIPS = 2;

export interface Placed {
  card: Card;
  /** The value it was said to be. */
  claim: number;
  by: number;
}

/** `n` counts every entry ever made, so a phone can tell which ones are new. */
export type Entry = { n: number } & (
  | { k: 'draw'; by: number }
  | { k: 'play'; by: number; claim: number }
  /** Turned over: `by` turned `of`'s card over; `taker` took the pile (`cards` cards). */
  | { k: 'call'; by: number; of: number; card: Card; claim: number; lied: boolean; taker: number; cards: number }
  | { k: 'quad'; by: number; value: number }
  | { k: 'lose'; by: number }
);
type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, 'n'> : never) : never;

export interface Game {
  phase: 'play' | 'over';
  /** The circle, by slot; null once drawn. */
  ring: (Card | null)[];
  /** By seat. */
  hands: Card[][];
  /** Face down in the middle, the top card last. */
  pile: Placed[];
  turn: number;
  /** The player up may still turn the top card over (they haven't drawn or played yet). */
  canCall: boolean;
  /** Four of a kind laid out of the game. */
  burned: { by: number; value: number }[];
  /** Whoever got the four Jacks. */
  loser: number | null;
  log: Entry[];
  /** How many entries were ever made. */
  seq: number;
  /** By seat. */
  sips: { drunk: number; given: number }[];
}

export const same = (a: Card, b: Card) => a.value === b.value && a.suit === b.suit;
const byValue = (a: Card, b: Card) => a.value - b.value || a.suit.localeCompare(b.suit);
export const sortHand = (cards: Card[]) => [...cards].sort(byValue);
/** The log with these entries added (numbered on), and the new count. */
const logged = (g: Game, ...e: NewEntry[]) => ({
  log: [...g.log, ...e.map((x, i) => ({ ...x, n: g.seq + i + 1 }) as Entry)].slice(-16),
  seq: g.seq + e.length,
});

/** The 32-card deck: 7 to Ace in every suit. */
export function shortDeck(): Card[] {
  return newDeck().filter((c) => c.value >= LOWEST);
}

export function newGame(players: number, first = 0, deck: Card[] = shuffle(shortDeck())): Game {
  return {
    phase: 'play',
    ring: [...deck],
    hands: Array.from({ length: players }, () => []),
    pile: [],
    turn: first,
    canCall: false,
    burned: [],
    loser: null,
    log: [],
    seq: 0,
    sips: Array.from({ length: players }, () => ({ drunk: 0, given: 0 })),
  };
}

/** The lowest value that may be said now. */
export const lowestClaim = (g: Game) => g.pile.at(-1)?.claim ?? LOWEST;

const ringLeft = (g: Game) => g.ring.some(Boolean);

/** What the player up can do: turn the top card over, draw from the circle, play from the hand. */
export function options(g: Game, who: number) {
  const up = g.phase === 'play' && g.turn === who;
  const call = up && g.canCall && g.pile.length > 0;
  const play = up && g.hands[who].length > 0;
  const draw = up && !play && ringLeft(g);
  return { call, draw, play, /** Nothing else left: turning over is a must. */ mustCall: call && !play && !draw };
}

/** Passes the turn on, past anyone who can't do anything (no cards, nothing to draw, nothing to turn over). */
function advance(g: Game, from: number): Game {
  const n = g.hands.length;
  let next = (from + 1) % n;
  for (let k = 0; k < n; k++) {
    const o = options({ ...g, turn: next }, next);
    if (o.call || o.draw || o.play) break;
    next = (next + 1) % n;
  }
  return { ...g, turn: next };
}

export function draw(g: Game, who: number, slot: number): Game {
  const card = g.ring[slot];
  if (!options(g, who).draw || !card) return g;
  const ring = g.ring.map((c, i) => (i === slot ? null : c));
  const hands = g.hands.map((h, s) => (s === who ? [card] : h));
  return { ...g, ring, hands, canCall: false, ...logged(g, { k: 'draw', by: who }) };
}

export function play(g: Game, who: number, card: Card, claim: number): Game {
  if (!options(g, who).play || !g.hands[who].some((c) => same(c, card))) return g;
  if (!Number.isInteger(claim) || claim < lowestClaim(g) || claim > ACE) return g;
  const hands = g.hands.map((h, s) => (s === who ? h.filter((c) => !same(c, card)) : h));
  const next: Game = {
    ...g,
    hands,
    pile: [...g.pile, { card, claim, by: who }],
    canCall: true,
    ...logged(g, { k: 'play', by: who, claim }),
  };
  return advance(next, who);
}

/**
 * Four of a value in this hand: out of the game (and sips to hand out). Four Jacks instead: the
 * Arschloch, game over.
 */
function sortOut(g: Game, who: number): Game {
  const hand = g.hands[who];
  const count = (v: number) => hand.filter((c) => c.value === v).length;
  if (count(JACK) >= 4) return { ...g, phase: 'over', loser: who, ...logged(g, { k: 'lose', by: who }) };
  const quads = [...new Set(hand.map((c) => c.value))].filter((v) => count(v) >= 4);
  if (!quads.length) return g;
  return {
    ...g,
    hands: g.hands.map((h, s) => (s === who ? h.filter((c) => !quads.includes(c.value)) : h)),
    burned: [...g.burned, ...quads.map((value) => ({ by: who, value }))],
    sips: g.sips.map((x, s) => (s === who ? { ...x, given: x.given + QUAD_SIPS * quads.length } : x)),
    ...logged(g, ...quads.map((value) => ({ k: 'quad' as const, by: who, value }))),
  };
}

/** Turn the card before over: a lie, and the liar takes the pile; the truth, and you do. */
export function call(g: Game, who: number): Game {
  if (!options(g, who).call) return g;
  const top = g.pile.at(-1)!;
  const lied = top.card.value !== top.claim;
  const taker = lied ? top.by : who;
  const cards = g.pile.map((p) => p.card);
  let next: Game = {
    ...g,
    hands: g.hands.map((h, s) => (s === taker ? sortHand([...h, ...cards]) : h)),
    pile: [],
    canCall: false,
    sips: g.sips.map((x, s) => (s === taker ? { ...x, drunk: x.drunk + cards.length } : x)),
    ...logged(g, { k: 'call', by: who, of: top.by, card: top.card, claim: top.claim, lied, taker, cards: cards.length }),
  };
  next = sortOut(next, taker);
  if (next.phase === 'over') return next;
  // Whoever turned it over carries on, if they can (else the next one who can).
  const o = options(next, who);
  return o.draw || o.play ? next : advance(next, who);
}

/** Every card in the game, wherever it is (four of a kind laid out count four each). */
export function cardCount(g: Game) {
  return g.ring.filter(Boolean).length + g.hands.flat().length + g.pile.length + g.burned.length * 4;
}
