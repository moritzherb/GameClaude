import { shuffle } from '../../lib/random';
import { newDeck, type Suit } from '../../lib/cards';

/**
 * Egyptian Rat Screw: everyone plays the top card of their face-down pile into the middle in turn.
 * A face card or an Ace makes the next player answer with one within so many tries; the slap rules
 * win the pile for whoever slaps first. The one who ends up with every card wins.
 */

/** A card: 2–10, J 11, Q 12, K 13, A 14, or a Joker (value 0). */
export interface Card {
  value: number;
  suit: Suit | 'joker';
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

/** How many tries the next player has to answer a face card or an Ace. */
export const TRIES: Record<number, number> = { 11: 1, 12: 2, 13: 3, 14: 4 };

export const isFace = (c: Card) => c.value >= 11;
export const isJoker = (c: Card) => c.suit === 'joker';

/** Why a pile may be slapped. */
export type SlapRule = 'joker' | 'double' | 'sandwich' | 'tens' | 'run' | 'marriage';

export type Entry =
  | { k: 'slap'; by: number; rule: SlapRule; n: number }
  | { k: 'wrong'; by: number; gave: number }
  | { k: 'won'; by: number; n: number }
  | { k: 'out'; by: number };

export interface Game {
  /** Each seat's face-down pile, its top first. */
  piles: Card[][];
  /** The cards played into the middle, the top last. */
  middle: Card[];
  /** Whose turn it is to play. */
  turn: number;
  /** While a face card is being answered: the tries the one on turn still has (0: none on). */
  tries: number;
  /** Who played the face card being answered (wins the pile if the tries run out). */
  challenger: number | null;
  /** The pile is won by the challenge: waiting for this seat to take it (slaps still count). */
  claim: number | null;
  /** Slapped wrongly with no cards left to pay: out of the game. */
  out: boolean[];
  jokers: boolean;
  /** What happened last (for the line under the pile). */
  last: Entry | null;
  winner: number | null;
}

/** All cards dealt out one at a time, starting left of the dealer (seat 0); seat 1 plays first. */
export function newGame(players: number, jokers: boolean, deck: Card[] = shuffle<Card>([...newDeck(), ...(jokers ? [JOKER, JOKER] : [])])): Game {
  const piles: Card[][] = Array.from({ length: players }, () => []);
  deck.forEach((c, i) => piles[(i + 1) % players].push(c));
  return { piles, middle: [], turn: 1 % players, tries: 0, challenger: null, claim: null, out: Array(players).fill(false), jokers, last: null, winner: null };
}

const JOKER: Card = { value: 0, suit: 'joker' };

/** The next seat after `from` that still has cards (or `from` itself if nobody else has any). */
export function nextWithCards(g: Game, from: number): number {
  const n = g.piles.length;
  for (let k = 1; k <= n; k++) {
    const s = (from + k) % n;
    if (g.piles[s].length) return s;
  }
  return from;
}

/** The value a card counts for the Tens rule: 2–10 as they are, an Ace 1, faces and Jokers nothing. */
const tenValue = (c: Card) => (isJoker(c) ? null : c.value === 14 ? 1 : c.value <= 10 ? c.value : null);

/** Whether the middle may be slapped now, and why (null: it may not). */
export function slapRule(middle: Card[]): SlapRule | null {
  const n = middle.length;
  if (!n) return null;
  const top = middle[n - 1];
  const below = middle[n - 2];
  const third = middle[n - 3];
  if (isJoker(top)) return 'joker';
  if (below && !isJoker(below) && below.value === top.value) return 'double';
  if (third && !isJoker(third) && third.value === top.value) return 'sandwich';
  const a = tenValue(top);
  if (a != null && below) {
    const b = tenValue(below);
    if (b != null && a + b === 10) return 'tens';
    // With a letter card (J, Q, K) between them.
    if (third && below.value >= 11 && below.value <= 13 && !isJoker(below)) {
      const c = tenValue(third);
      if (c != null && a + c === 10) return 'tens';
    }
  }
  if (n >= 4) {
    const run = middle.slice(-4);
    if (run.every((c) => !isJoker(c))) {
      // 2…A round in a circle: Q, K, A, 2 counts.
      const step = (x: Card, y: Card) => ((y.value - 2 - (x.value - 2) + 13) % 13);
      const steps = [step(run[0], run[1]), step(run[1], run[2]), step(run[2], run[3])];
      if (steps.every((s) => s === 1) || steps.every((s) => s === 12)) return 'run';
    }
  }
  if (below && ((top.value === 12 && below.value === 13) || (top.value === 13 && below.value === 12)) && !isJoker(below)) return 'marriage';
  return null;
}

/** Whoever holds every card (with the middle empty) has won. */
function settle(g: Game): Game {
  const holders = g.piles.map((p, i) => (p.length ? i : -1)).filter((i) => i >= 0);
  if (!g.middle.length && g.claim == null && holders.length === 1) return { ...g, winner: holders[0] };
  return g;
}

/** The player on turn plays the top card of their pile. */
export function play(g: Game, seat: number): Game {
  if (g.winner != null || g.claim != null || seat !== g.turn || !g.piles[seat].length) return g;
  const [card, ...rest] = g.piles[seat];
  const piles = g.piles.map((p, i) => (i === seat ? rest : p));
  const middle = [...g.middle, card];
  const base = { ...g, piles, middle, last: null };
  if (isFace(card)) {
    // A new challenge: the next player answers it.
    const next = nextWithCards(base, seat);
    if (next === seat) return { ...base, tries: 0, challenger: seat, claim: seat };
    return { ...base, turn: next, tries: TRIES[card.value], challenger: seat };
  }
  if (g.challenger != null) {
    const tries = g.tries - 1;
    // Out of tries (or of cards): the one who played the face card wins the pile.
    if (tries <= 0 || !rest.length) return { ...base, tries: 0, claim: g.challenger };
    return { ...base, tries };
  }
  return { ...base, turn: nextWithCards(base, seat) };
}

/** The one the challenge was won for takes the pile (under their own) and leads. */
export function take(g: Game, seat: number): Game {
  if (g.claim !== seat) return g;
  return settle(collect(g, seat, { k: 'won', by: seat, n: g.middle.length }));
}

function collect(g: Game, seat: number, last: Entry): Game {
  const piles = g.piles.map((p, i) => (i === seat ? [...p, ...g.middle] : p));
  return { ...g, piles, middle: [], tries: 0, challenger: null, claim: null, turn: seat, last };
}

/** A slap: the pile if it may be slapped now; else every other player gets one of their cards, under
 *  their own pile (or, with none left to pay with, they're out). */
export function slap(g: Game, seat: number): Game {
  if (g.winner != null || g.out[seat]) return g;
  const rule = slapRule(g.middle);
  if (rule) return settle(collect(g, seat, { k: 'slap', by: seat, rule, n: g.middle.length }));
  const pile = g.piles[seat];
  if (!pile.length) {
    const out = g.out.map((o, i) => (i === seat ? true : o));
    return settle({ ...g, out, last: { k: 'out', by: seat } });
  }
  // One card each, round the table from their left, for as long as they have cards.
  const piles = g.piles.map((p) => [...p]);
  const n = g.piles.length;
  let gave = 0;
  for (let k = 1; k < n && piles[seat].length; k++) {
    const to = (seat + k) % n;
    if (g.out[to]) continue;
    piles[to].push(piles[seat].shift()!);
    gave++;
  }
  const rest = piles[seat];
  const next = { ...g, piles, last: { k: 'wrong', by: seat, gave } as Entry };
  // Their last card was on turn: the turn moves on.
  if (seat === g.turn && !rest.length && g.claim == null) return { ...next, turn: nextWithCards(next, seat) };
  return next;
}

export const cardCount = (g: Game) => g.piles.reduce((n, p) => n + p.length, 0) + g.middle.length;

