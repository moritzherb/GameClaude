import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/*
 * Arschloch – rules
 * - 32 cards (7 to Ace, Ace highest), 3 to 6 players, all dealt out, one at a time.
 * - The first round, whoever holds the 7 of clubs starts. After that the Arschloch starts.
 * - Lead one card or several of the same value (up to four). Then, in turn, play as many cards
 *   of one higher value, or pass. Passing costs a sip, and you may play again on your next turn.
 * - Once everyone else has passed in a row, the trick is closed: whoever played last hands out a
 *   sip and leads the next trick. An Ace can't be beaten: it closes the trick right away.
 * - Out of cards: you're out, the earlier the better. The last one with cards is the Arschloch.
 *   Ranks: President, Vice President, citizens, Vice Arschloch, Arschloch (with 3 players: only
 *   President, citizen and Arschloch).
 * - End of a round: the Arschloch drinks 3 and the Vice Arschloch 2; the President hands out 3 and
 *   the Vice President 2.
 * - Next round, after dealing: the Arschloch gives their 2 best cards to the President, the Vice
 *   Arschloch their best one to the Vice President. The President gives any 2 back, the Vice
 *   President any 1.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;
export const ACE = 14;

export type Rank = 'president' | 'vice' | 'citizen' | 'vice-arschloch' | 'arschloch';

/** Sips at the end of a round: drunk (Arschloch, Vice Arschloch) or handed out (President, Vice). */
export const ROUND_SIPS: Record<Rank, { drink: number; give: number }> = {
  president: { drink: 0, give: 3 },
  vice: { drink: 0, give: 2 },
  citizen: { drink: 0, give: 0 },
  'vice-arschloch': { drink: 2, give: 0 },
  arschloch: { drink: 3, give: 0 },
};

export interface Play {
  by: number;
  cards: Card[];
}

export type Entry =
  | { k: 'play'; by: number; cards: Card[]; out: boolean }
  | { k: 'pass'; by: number }
  /** The trick is closed: `by` played last and hands out a sip. */
  | { k: 'close'; by: number }
  /** The exchange at the start of a round: `n` cards from one seat to another. */
  | { k: 'give'; from: number; to: number; n: number };

/** A give-back still owed: the President (or Vice) picks `n` cards for the Arschloch (or Vice). */
export interface Owed {
  from: number;
  to: number;
  n: number;
}

export interface Game {
  phase: 'exchange' | 'play' | 'done';
  round: number;
  /** By seat. */
  hands: Card[][];
  /** The plays in the current trick, the one to beat last. */
  trick: Play[];
  /** Cards from closed tricks this round. */
  discard: Card[];
  turn: number;
  /** Passes in a row since the last play. */
  passes: number;
  /** Seats in the order they ran out of cards (the last one in a finished round is the Arschloch). */
  out: number[];
  /** Ranks from the round before (they decide the exchange), by seat; null in the first round. */
  ranks: (Rank | null)[];
  /** Give-backs still owed before play starts. */
  owed: Owed[];
  /** The cards each seat got in the exchange (to show them), by seat. */
  got: Card[][];
  log: Entry[];
  /** Sips over the whole game, by seat: drunk and handed out. */
  sips: { drunk: number; given: number }[];
}

const byValue = (a: Card, b: Card) => a.value - b.value || a.suit.localeCompare(b.suit);
export const sortHand = (cards: Card[]) => [...cards].sort(byValue);
export const same = (a: Card, b: Card) => a.value === b.value && a.suit === b.suit;
const pushLog = (log: Entry[], ...e: Entry[]) => [...log, ...e].slice(-16);

/** The 32-card deck: 7 to Ace in every suit. */
export function shortDeck(): Card[] {
  return newDeck().filter((c) => c.value >= 7);
}

/** Deal everything out, one at a time, starting with `first`. */
function dealOut(players: number, first: number, deck: Card[]) {
  const hands: Card[][] = Array.from({ length: players }, () => []);
  deck.forEach((c, i) => hands[(first + i) % players].push(c));
  return hands.map(sortHand);
}

const fresh = (players: number) => ({
  trick: [] as Play[],
  discard: [] as Card[],
  passes: 0,
  out: [] as number[],
  got: Array.from({ length: players }, () => [] as Card[]),
});

/** The first round: no ranks yet, whoever holds the 7 of clubs starts. */
export function newGame(players: number, deck: Card[] = shuffle(shortDeck())): Game {
  const hands = dealOut(players, 0, deck);
  const start = Math.max(0, hands.findIndex((h) => h.some((c) => c.value === 7 && c.suit === 'clubs')));
  return {
    phase: 'play',
    round: 1,
    hands,
    turn: start,
    ranks: Array.from({ length: players }, () => null),
    owed: [],
    log: [],
    sips: Array.from({ length: players }, () => ({ drunk: 0, given: 0 })),
    ...fresh(players),
  };
}

/** Everyone's rank from the finishing order (last one in the list: the Arschloch). */
export function ranksFrom(order: number[]): Rank[] {
  const n = order.length;
  const ranks: Rank[] = Array.from({ length: n }, () => 'citizen');
  order.forEach((seat, place) => {
    if (place === 0) ranks[seat] = 'president';
    else if (place === n - 1) ranks[seat] = 'arschloch';
    else if (n >= 4 && place === 1) ranks[seat] = 'vice';
    else if (n >= 4 && place === n - 2) ranks[seat] = 'vice-arschloch';
  });
  return ranks;
}

/**
 * The next round: deal (the Arschloch deals, starting to their left), then the Arschloch's 2 best
 * cards go to the President and the Vice Arschloch's best to the Vice; those two then owe cards back.
 */
export function nextRound(g: Game, deck: Card[] = shuffle(shortDeck())): Game {
  if (g.phase !== 'done') return g;
  const n = g.hands.length;
  const ranks = ranksFrom(g.out);
  const seatOf = (r: Rank) => ranks.indexOf(r);
  const asshole = seatOf('arschloch');
  const hands = dealOut(n, (asshole + 1) % n, deck);
  const got = Array.from({ length: n }, () => [] as Card[]);
  const owed: Owed[] = [];
  let log: Entry[] = [];
  const pass = (from: number, to: number, k: number) => {
    if (from < 0 || to < 0) return;
    const best = sortHand(hands[from]).slice(-k);
    hands[from] = hands[from].filter((c) => !best.some((b) => same(b, c)));
    hands[to] = sortHand([...hands[to], ...best]);
    got[to] = best;
    owed.push({ from: to, to: from, n: k });
    log = pushLog(log, { k: 'give', from, to, n: k });
  };
  pass(asshole, seatOf('president'), 2);
  pass(seatOf('vice-arschloch'), seatOf('vice'), 1);
  return {
    ...g,
    phase: owed.length ? 'exchange' : 'play',
    round: g.round + 1,
    hands,
    ranks,
    owed,
    log,
    turn: asshole,
    ...fresh(n),
    got,
  };
}

/** The President (or Vice) gives cards of their choice back. */
export function giveBack(g: Game, who: number, cards: Card[]): Game {
  const i = g.owed.findIndex((o) => o.from === who);
  if (g.phase !== 'exchange' || i < 0) return g;
  const o = g.owed[i];
  if (cards.length !== o.n || !cards.every((c) => g.hands[who].some((h) => same(h, c)))) return g;
  if (new Set(cards.map((c) => `${c.value}${c.suit}`)).size !== cards.length) return g;
  const hands = g.hands.map((h, s) =>
    s === who ? h.filter((c) => !cards.some((x) => same(x, c))) : s === o.to ? sortHand([...h, ...cards]) : h,
  );
  const got = g.got.map((x, s) => (s === o.to ? cards : x));
  const owed = g.owed.filter((_, k) => k !== i);
  return { ...g, hands, got, owed, phase: owed.length ? 'exchange' : 'play', log: pushLog(g.log, { k: 'give', from: who, to: o.to, n: o.n }) };
}

/** The play to beat in this trick, if any. */
export const toBeat = (g: Game): Play | null => g.trick.at(-1) ?? null;

/** Are these cards a legal play right now? */
export function canPlay(g: Game, who: number, cards: Card[]) {
  if (g.phase !== 'play' || g.turn !== who || !cards.length || cards.length > 4) return false;
  if (!cards.every((c) => c.value === cards[0].value)) return false;
  if (!cards.every((c) => g.hands[who].some((h) => same(h, c)))) return false;
  if (new Set(cards.map((c) => c.suit)).size !== cards.length) return false;
  const top = toBeat(g);
  return !top || (cards.length === top.cards.length && cards[0].value > top.cards[0].value);
}

/** Has this player anything that beats the trick? (Leading, anything goes.) */
export function hasPlay(g: Game, who: number) {
  const top = toBeat(g);
  if (!top) return g.hands[who].length > 0;
  const counts = new Map<number, number>();
  for (const c of g.hands[who]) counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
  return [...counts].some(([v, k]) => v > top.cards[0].value && k >= top.cards.length);
}

const inPlay = (g: Pick<Game, 'hands'>, seat: number) => g.hands[seat].length > 0;

/** The next seat after `from` that still has cards (`from` itself only if nobody else has). */
function nextIn(g: Pick<Game, 'hands'>, from: number) {
  const n = g.hands.length;
  for (let k = 1; k <= n; k++) if (inPlay(g, (from + k) % n)) return (from + k) % n;
  return from;
}

/** Round over (one player or nobody left with cards): the last one is the Arschloch; round sips. */
function finish(g: Game): Game {
  const left = g.hands.map((_, s) => s).filter((s) => !g.out.includes(s));
  const out = [...g.out, ...left];
  const ranks = ranksFrom(out);
  const sips = g.sips.map((x, s) => ({ drunk: x.drunk + ROUND_SIPS[ranks[s]].drink, given: x.given + ROUND_SIPS[ranks[s]].give }));
  return { ...g, phase: 'done', out, sips };
}

/** The trick is closed: whoever played last hands out a sip and leads (or the next one with cards). */
function close(g: Game): Game {
  const last = toBeat(g)!;
  const sips = g.sips.map((x, s) => (s === last.by ? { ...x, given: x.given + 1 } : x));
  return {
    ...g,
    trick: [],
    discard: [...g.discard, ...g.trick.flatMap((p) => p.cards)],
    passes: 0,
    sips,
    turn: inPlay(g, last.by) ? last.by : nextIn(g, last.by),
    log: pushLog(g.log, { k: 'close', by: last.by }),
  };
}

export function play(g: Game, who: number, cards: Card[]): Game {
  if (!canPlay(g, who, cards)) return g;
  const hands = g.hands.map((h, s) => (s === who ? h.filter((c) => !cards.some((x) => same(x, c))) : h));
  const out = hands[who].length ? g.out : [...g.out, who];
  let next: Game = {
    ...g,
    hands,
    out,
    trick: [...g.trick, { by: who, cards }],
    passes: 0,
    log: pushLog(g.log, { k: 'play', by: who, cards, out: !hands[who].length }),
  };
  if (hands.filter((h) => h.length).length <= 1) return finish(next);
  // An Ace can't be beaten: the trick is closed right away.
  if (cards[0].value === ACE) return close(next);
  next = { ...next, turn: nextIn(next, who) };
  return next;
}

export function pass(g: Game, who: number): Game {
  if (g.phase !== 'play' || g.turn !== who || !g.trick.length) return g;
  const sips = g.sips.map((x, s) => (s === who ? { ...x, drunk: x.drunk + 1 } : x));
  const next: Game = { ...g, sips, passes: g.passes + 1, log: pushLog(g.log, { k: 'pass', by: who }) };
  // Everyone still in, other than whoever played last, has passed.
  const last = toBeat(g)!.by;
  const others = g.hands.filter((h, s) => h.length && s !== last).length;
  if (next.passes >= others) return close(next);
  return { ...next, turn: nextIn(next, who) };
}

/** Every card in the game, wherever it is. */
export function allCards(g: Game): Card[] {
  return [...g.hands.flat(), ...g.trick.flatMap((p) => p.cards), ...g.discard];
}
