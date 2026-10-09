import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/** Values from 2 to Ace (14), the order of the piles in the middle. */
export const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Sips the dealer saves up when the card is guessed on the first or second try. */
export const FIRST_TRY_SIPS = 6;
export const SECOND_TRY_SIPS = 3;
/** Misses in a row before the deck moves on to the next dealer. */
export const MISSES_TO_PASS = 3;

export type Outcome = 'first' | 'second' | 'miss';

export interface Result {
  card: Card;
  outcome: Outcome;
  /** Sips the dealer saves up for this card. */
  sips: number;
}

export interface Game {
  /** deck[0] is the card the dealer is looking at. */
  deck: Card[];
  /** The middle: one pile per value, piles[0] = the 2s … piles[12] = the Aces. */
  piles: Card[][];
  /** Index into the players (seat order: the next index sits to the left). */
  dealer: number;
  guesser: number;
  /** The guesser's wrong first guess; set while they get their second chance. */
  firstGuess: number | null;
  /** How the current card ended, until the next player is up. */
  result: Result | null;
  /** Players in a row who didn't get their card. */
  misses: number;
  /** Sips the dealer has saved up; drunk all at once when they lose the deck. */
  saved: number;
  /** Set when the deck has just moved on: who had it and how much they drink now. */
  handover: { dealer: number; sips: number } | null;
  /** Sips each player drank as dealer, by player index (for the end screen). */
  drank: number[];
  over: boolean;
}

/** The next seat to the left that isn't the dealer. */
export function nextGuesser(from: number, dealer: number, players: number) {
  let i = (from + 1) % players;
  if (i === dealer) i = (i + 1) % players;
  return i;
}

export function newGame(players: number, dealer: number, deck: Card[] = shuffle(newDeck())): Game {
  return {
    deck,
    piles: VALUES.map(() => []),
    dealer,
    guesser: nextGuesser(dealer, dealer, players),
    firstGuess: null,
    result: null,
    misses: 0,
    saved: 0,
    handover: null,
    drank: Array<number>(players).fill(0),
    over: false,
  };
}

/** Where the dealer's card lies compared to a guess. */
export function direction(guess: number, actual: number): 'higher' | 'lower' | 'right' {
  return actual === guess ? 'right' : actual > guess ? 'higher' : 'lower';
}

/** How many of a value are already in the middle (4 = none left in the deck). */
export const outCount = (g: Game, value: number) => g.piles[value - 2].length;

/** Values the guesser can still sensibly name: not all four out, and on the right side after a miss. */
export function possible(g: Game, value: number) {
  if (outCount(g, value) >= 4) return false;
  if (g.firstGuess == null || g.deck.length === 0) return true;
  const dir = direction(g.firstGuess, g.deck[0].value);
  return dir === 'higher' ? value > g.firstGuess : value < g.firstGuess;
}

/** The guesser names a value. A wrong first guess opens the second chance; otherwise the card goes to the middle. */
export function guess(g: Game, value: number): Game {
  if (g.result || g.over || g.handover || g.deck.length === 0) return g;
  const [card, ...deck] = g.deck;
  const hit = card.value === value;
  if (!hit && g.firstGuess == null) return { ...g, firstGuess: value };
  const outcome: Outcome = hit ? (g.firstGuess == null ? 'first' : 'second') : 'miss';
  const sips = outcome === 'first' ? FIRST_TRY_SIPS : outcome === 'second' ? SECOND_TRY_SIPS : 0;
  return {
    ...g,
    deck,
    piles: g.piles.map((p, i) => (i === card.value - 2 ? [...p, card] : p)),
    result: { card, outcome, sips },
    misses: outcome === 'miss' ? g.misses + 1 : 0,
    saved: g.saved + sips,
  };
}

/** On to the next player; after three misses in a row the deck moves one seat to the left. */
export function next(g: Game, players: number): Game {
  if (!g.result) return g;
  const base = { ...g, result: null, firstGuess: null };
  const drink = (who: number) => g.drank.map((d, i) => (i === who ? d + g.saved : d));
  if (g.deck.length === 0) {
    return { ...base, over: true, handover: { dealer: g.dealer, sips: g.saved }, drank: drink(g.dealer), saved: 0 };
  }
  if (g.misses >= MISSES_TO_PASS) {
    const dealer = (g.dealer + 1) % players;
    return {
      ...base,
      dealer,
      // The new dealer goes on with whoever sits after the last guesser.
      guesser: nextGuesser(g.guesser, dealer, players),
      misses: 0,
      saved: 0,
      handover: { dealer: g.dealer, sips: g.saved },
      drank: drink(g.dealer),
    };
  }
  return { ...base, guesser: nextGuesser(g.guesser, g.dealer, players) };
}

/** Closes the dealer change screen. */
export const takeOver = (g: Game): Game => ({ ...g, handover: null });
