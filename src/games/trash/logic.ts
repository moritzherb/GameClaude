import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/*
 * Trash – rules
 * - Two players. Each gets a row of face-down cards: slot 1 (Ace) to 10, five on top, five below.
 * - The player who isn't dealing starts. Take the top card of the stock, or the top of the
 *   discard pile if you can use it.
 * - A card goes face up into its own slot (Ace = 1 … 10) if that slot is still face down; the card
 *   that lay there is picked up and played the same way, and so on.
 * - A Jack is wild: it goes into any face-down slot you like. Queens and Kings are useless.
 * - A card you can't use (its slot is already face up, or Q/K) goes on the discard pile and the
 *   turn passes.
 * - Whoever turns all their slots face up first wins the round. Next round the winner gets one
 *   card fewer and deals, so the loser starts. Whoever wins a round with a single card wins the game.
 */

export const START_SIZE = 10;
export type Who = 0 | 1;

export interface Slot {
  card: Card;
  up: boolean;
}

export interface Game {
  /** How many cards each player plays this round. */
  sizes: [number, number];
  sides: [Slot[], Slot[]];
  stock: Card[];
  /** Top card last. */
  discard: Card[];
  dealer: Who;
  turn: Who;
  /** The card the player whose turn it is holds right now. */
  hand: Card | null;
  phase: 'draw' | 'place' | 'round-over' | 'game-over';
  winner: Who | null;
  round: number;
}

const other = (w: Who): Who => (w === 0 ? 1 : 0);

/** Where a card belongs: 0-based slot, 'wild' for a Jack, null for a Queen or King. */
export function slotFor(card: Card): number | 'wild' | null {
  if (card.value === 14) return 0;
  if (card.value <= 10) return card.value - 1;
  if (card.value === 11) return 'wild';
  return null;
}

/** Can this player put the card down? */
export function usable(g: Game, who: Who, card: Card) {
  const slots = g.sides[who];
  const at = slotFor(card);
  if (at === 'wild') return slots.some((s) => !s.up);
  return at != null && at < slots.length && !slots[at].up;
}

/** Deal a round: the dealer gives the other player the first card, then takes turns. */
export function deal(sizes: [number, number], dealer: Who, round = 1, deck: Card[] = shuffle(newDeck())): Game {
  const cards = [...deck];
  const sides: [Slot[], Slot[]] = [[], []];
  const first = other(dealer);
  for (let i = 0; i < Math.max(...sizes); i++) {
    for (const who of [first, dealer]) if (i < sizes[who]) sides[who].push({ card: cards.shift()!, up: false });
  }
  return { sizes, sides, stock: cards, discard: [], dealer, turn: first, hand: null, phase: 'draw', winner: null, round };
}

export const newGame = (dealer: Who, deck?: Card[]) => deal([START_SIZE, START_SIZE], dealer, 1, deck);

/** Take the top card of the stock (reshuffling the discard pile, all but its top card, if the stock is empty). */
export function draw(g: Game, rand: <T>(items: readonly T[]) => T[] = shuffle): Game {
  if (g.phase !== 'draw') return g;
  let { stock, discard } = g;
  if (!stock.length) {
    stock = rand(discard.slice(0, -1));
    discard = discard.slice(-1);
  }
  const [card, ...rest] = stock;
  if (!card) return g;
  return { ...g, stock: rest, discard, hand: card, phase: 'place' };
}

/** Take the top of the discard pile – only if you can use it. */
export function takeDiscard(g: Game): Game {
  const top = g.discard.at(-1);
  if (g.phase !== 'draw' || !top || !usable(g, g.turn, top)) return g;
  return { ...g, discard: g.discard.slice(0, -1), hand: top, phase: 'place' };
}

/** Put the held card into its slot (a Jack into the chosen slot) and pick up what lay there. */
export function place(g: Game, chosen?: number): Game {
  const card = g.hand;
  if (g.phase !== 'place' || !card || !usable(g, g.turn, card)) return g;
  const at = slotFor(card) === 'wild' ? chosen : (slotFor(card) as number);
  const slots = g.sides[g.turn];
  if (at == null || at < 0 || at >= slots.length || slots[at].up) return g;
  const picked = slots[at].card;
  const mine = slots.map((s, i) => (i === at ? { card, up: true } : s));
  const sides: [Slot[], Slot[]] = g.turn === 0 ? [mine, g.sides[1]] : [g.sides[0], mine];
  if (mine.every((s) => s.up)) {
    // Round won. Winning with the last single card wins the game.
    const last = g.sizes[g.turn] === 1;
    return { ...g, sides, hand: null, discard: [...g.discard, picked], phase: last ? 'game-over' : 'round-over', winner: g.turn };
  }
  return { ...g, sides, hand: picked };
}

/** The held card is no use: onto the discard pile, and it's the other player's turn. */
export function toss(g: Game): Game {
  if (g.phase !== 'place' || !g.hand || usable(g, g.turn, g.hand)) return g;
  return { ...g, discard: [...g.discard, g.hand], hand: null, turn: other(g.turn), phase: 'draw' };
}

/** Next round: the winner gets one card fewer and deals, so the loser starts. */
export function nextRound(g: Game, deck?: Card[]): Game {
  if (g.phase !== 'round-over' || g.winner == null) return g;
  const sizes: [number, number] = [...g.sizes];
  sizes[g.winner] -= 1;
  return deal(sizes, g.winner, g.round + 1, deck);
}

export const faceDown = (g: Game, who: Who) => g.sides[who].filter((s) => !s.up).length;
