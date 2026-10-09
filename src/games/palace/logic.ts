import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/*
 * Palace – rules
 * - One 52-card deck, no jokers. Dealt one at a time, starting left of the dealer: first three
 *   face-down cards each, then six hand cards each. Everyone puts three of their hand cards face up
 *   on their face-down cards. The rest is the stock.
 * - Starting left of the dealer, play one card or several of the same value onto the pile: the same
 *   value or higher. While the stock lasts, draw back up to three hand cards after playing.
 * - Can't play? Take the whole pile. Or risk it (allowed any time while the stock lasts, to save
 *   your good cards): turn over the top card of the stock onto the pile. If it fits, you're lucky
 *   and play goes on. If not, you take the pile and that card.
 * - Once the stock is gone and your hand is empty, play your face-up cards; once those are gone,
 *   your face-down cards, one at a time, blind. Whatever doesn't fit means taking the pile, and the
 *   hand has to go first again. First player with no cards left wins.
 * - Specials: 2, 3 and 10 can always be played, and so can four of a kind.
 *   7: the next player has to play 7 or lower; after that it's 7 or higher again.
 *   10, and four cards of the same value in a row on the pile (played at once or one after the
 *   other; a 3 copying them doesn't count): the pile is cleared away, draw up, play again.
 *   2: start again from 2 (the pile stays), play again without drawing first.
 *   3: copies the card it lies on, specials included (on a 7: 7 or lower; on a 2: play again).
 */

export const MIN_PLAYERS = 2;
/** 9 cards each: five players use 45 of the 52 cards. */
export const MAX_PLAYERS = 5;
export const HAND = 3;
export const TABLE = 3;

export type Need = { kind: 'any' } | { kind: 'min'; v: number } | { kind: 'max7' };
export type Zone = 'hand' | 'up' | 'down';

export interface Side {
  hand: Card[];
  /** Face-up cards, by slot; null once played. Empty until chosen. */
  up: (Card | null)[];
  /** Face-down cards, by slot; null once played. */
  down: (Card | null)[];
  /** Has chosen their face-up cards. */
  ready: boolean;
}

export type Entry =
  | { k: 'play'; by: number; cards: Card[]; from: Zone | 'risk'; burn: boolean; again: boolean }
  | { k: 'take'; by: number; n: number; failed?: Card; how?: 'risk' | 'blind' };

export interface Game {
  phase: 'setup' | 'play' | 'over';
  /** By seat; the next seat sits to the left. */
  sides: Side[];
  stock: Card[];
  /** Top card last. */
  pile: Card[];
  /** Cleared away by a 10 or four of a kind: out of the game. */
  burned: Card[];
  need: Need;
  /** Value of the top card, with 3s copying the card below; null on an empty pile. */
  top: number | null;
  dealer: number;
  turn: number;
  /** The player whose turn it is goes again (after a 2, a 10 or four of a kind). */
  again: boolean;
  log: Entry[];
  winner: number | null;
}

export const same = (a: Card, b: Card) => a.value === b.value && a.suit === b.suit;
const next = (g: Game, i: number) => (i + 1) % g.sides.length;

/** Deal: three face-down cards each, then six hand cards each, one at a time, starting left of the dealer. */
export function deal(players: number, dealer: number, deck: Card[] = shuffle(newDeck())): Game {
  const cards = [...deck];
  const sides: Side[] = Array.from({ length: players }, () => ({ hand: [], up: [], down: [], ready: false }));
  const order = Array.from({ length: players }, (_, k) => (dealer + 1 + k) % players);
  for (let r = 0; r < TABLE; r++) for (const p of order) sides[p].down.push(cards.shift()!);
  for (let r = 0; r < HAND + TABLE; r++) for (const p of order) sides[p].hand.push(cards.shift()!);
  return {
    phase: 'setup',
    sides,
    stock: cards,
    pile: [],
    burned: [],
    need: { kind: 'any' },
    top: null,
    dealer,
    turn: (dealer + 1) % players,
    again: false,
    log: [],
    winner: null,
  };
}

/** May this many cards of this value go on the pile? */
export function fits(need: Need, value: number, count = 1) {
  if (count >= 4 || value === 2 || value === 3 || value === 10) return true;
  if (need.kind === 'any') return true;
  if (need.kind === 'max7') return value <= 7;
  return value >= need.v;
}

/** Where this player plays from right now; null once they have no cards left. */
export function zone(s: Side): Zone | null {
  if (s.hand.length) return 'hand';
  if (s.up.some(Boolean)) return 'up';
  if (s.down.some(Boolean)) return 'down';
  return null;
}

/** The cards a player can choose from right now (face-down cards are never shown). */
export function choosable(s: Side): Card[] {
  const z = zone(s);
  if (z === 'hand') return s.hand;
  if (z === 'up') return s.up.filter((c): c is Card => !!c);
  return [];
}

/** Can this card be part of a legal play from these cards (alone, or as four of a kind)? */
export function playable(need: Need, card: Card, from: Card[]) {
  return fits(need, card.value, from.filter((c) => c.value === card.value).length);
}

/** Has the player any legal play? Face-down cards always "can" be played: blind. */
export function canPlay(g: Game, who: number) {
  const s = g.sides[who];
  if (zone(s) === 'down') return true;
  const from = choosable(s);
  return from.some((c) => playable(g.need, c, from));
}

export const cardsLeft = (s: Side) => s.hand.length + s.up.filter(Boolean).length + s.down.filter(Boolean).length;

export type Act = { t: 'setup'; up: Card[] } | { t: 'play'; cards: Card[] } | { t: 'blind'; i: number } | { t: 'take' } | { t: 'risk' };

/** Applies one player's move. Anything that isn't allowed right now returns the game unchanged. */
export function apply(g: Game, who: number, a: Act): Game {
  const s = g.sides[who];
  if (!s) return g;

  if (a.t === 'setup') {
    if (g.phase !== 'setup' || s.ready || a.up.length !== TABLE) return g;
    const picked = a.up.map((c) => s.hand.find((h) => same(h, c)));
    if (picked.some((c) => !c) || new Set(a.up.map((c) => `${c.value}${c.suit}`)).size !== TABLE) return g;
    const side: Side = { ...s, up: picked as Card[], hand: s.hand.filter((h) => !a.up.some((c) => same(c, h))), ready: true };
    const sides = g.sides.map((x, i) => (i === who ? side : x));
    return { ...g, sides, phase: sides.every((x) => x.ready) ? 'play' : 'setup' };
  }

  if (g.phase !== 'play' || g.turn !== who) return g;
  const z = zone(s);

  if (a.t === 'play') {
    if ((z !== 'hand' && z !== 'up') || !a.cards.length) return g;
    const value = a.cards[0].value;
    if (a.cards.some((c) => c.value !== value)) return g;
    if (new Set(a.cards.map((c) => c.suit)).size !== a.cards.length) return g;
    const from = choosable(s);
    if (!a.cards.every((c) => from.some((f) => same(f, c)))) return g;
    if (!fits(g.need, value, a.cards.length)) return g;
    const side: Side =
      z === 'hand'
        ? { ...s, hand: s.hand.filter((h) => !a.cards.some((c) => same(c, h))) }
        : { ...s, up: s.up.map((u) => (u && a.cards.some((c) => same(c, u)) ? null : u)) };
    return lay({ ...g, sides: g.sides.map((x, i) => (i === who ? side : x)) }, who, a.cards, z);
  }

  if (a.t === 'blind') {
    const card = s.down[a.i];
    if (z !== 'down' || !card) return g;
    const side: Side = { ...s, down: s.down.map((d, i) => (i === a.i ? null : d)) };
    const after = { ...g, sides: g.sides.map((x, i) => (i === who ? side : x)) };
    return fits(g.need, card.value) ? lay(after, who, [card], 'down') : takePile(after, who, card, 'blind');
  }

  if (a.t === 'take') {
    if (z === 'down' || canPlay(g, who) || !g.pile.length) return g;
    return takePile(g, who);
  }

  if (a.t === 'risk') {
    // Allowed any time from the hand while the stock lasts: you may keep your good cards.
    if (z !== 'hand' || !g.stock.length) return g;
    const [card, ...stock] = g.stock;
    const after = { ...g, stock };
    return fits(g.need, card.value) ? lay(after, who, [card], 'risk') : takePile(after, who, card, 'risk');
  }

  return g;
}

/** Cards go on the pile (already taken from the player); specials, drawing up and the next turn. */
function lay(g: Game, who: number, cards: Card[], from: Zone | 'risk'): Game {
  const value = cards[0].value;
  // Four of the same value on top of the pile, really the same: a 3 in between breaks the row.
  const row = [...g.pile, ...cards].slice(-4);
  const burn = value === 10 || (row.length === 4 && row.every((c) => c.value === value));
  let { need, top } = g;
  let again = false;
  let pile = [...g.pile];
  let burned = g.burned;
  if (burn) {
    burned = [...burned, ...pile, ...cards];
    pile = [];
    need = { kind: 'any' };
    top = null;
    again = true;
  } else {
    pile = [...pile, ...cards];
    if (value === 2) {
      need = { kind: 'min', v: 2 };
      top = 2;
      again = true;
    } else if (value === 3) {
      // A 3 copies the card it lies on: what was needed is still needed, and a 2 below means again.
      again = top === 2;
    } else if (value === 7) {
      need = { kind: 'max7' };
      top = 7;
    } else {
      // Played under a 7: after that, it's 7 or higher again.
      need = { kind: 'min', v: need.kind === 'max7' ? 7 : value };
      top = value;
    }
  }

  // Back up to three hand cards while the stock lasts. After a 2 you go again without drawing
  // (unless your hand is empty).
  let stock = g.stock;
  const s = g.sides[who];
  let hand = s.hand;
  if (burn || !again || !hand.length) {
    const want = Math.max(0, HAND - hand.length);
    hand = [...hand, ...stock.slice(0, want)];
    stock = stock.slice(want);
  }
  const side = { ...s, hand };
  const sides = g.sides.map((x, i) => (i === who ? side : x));
  const log = [...g.log, { k: 'play' as const, by: who, cards, from, burn, again }].slice(-12);
  const done = cardsLeft(side) === 0;
  return {
    ...g,
    sides,
    stock,
    pile,
    burned,
    need,
    top,
    again: again && !done,
    log,
    phase: done ? 'over' : 'play',
    winner: done ? who : null,
    turn: done || again ? who : next(g, who),
  };
}

/** The whole pile goes into the player's hand (plus the card that didn't fit), and the turn passes. */
function takePile(g: Game, who: number, failed?: Card, how?: 'risk' | 'blind'): Game {
  const pile = failed ? [...g.pile, failed] : g.pile;
  const s = g.sides[who];
  const side = { ...s, hand: [...s.hand, ...pile] };
  return {
    ...g,
    sides: g.sides.map((x, i) => (i === who ? side : x)),
    pile: [],
    need: { kind: 'any' },
    top: null,
    again: false,
    log: [...g.log, { k: 'take' as const, by: who, n: pile.length, failed, how }].slice(-12),
    turn: next(g, who),
  };
}

/** Every card in the game, wherever it is: always the full deck, each card once. */
export function allCards(g: Game): Card[] {
  return [
    ...g.stock,
    ...g.pile,
    ...g.burned,
    ...g.sides.flatMap((s) => [...s.hand, ...s.up.filter((c): c is Card => !!c), ...s.down.filter((c): c is Card => !!c)]),
  ];
}

/* ---------------- What each phone may see ---------------- */

export interface PublicSide {
  hand: number;
  up: (Card | null)[];
  /** Which face-down slots still have a card. */
  down: boolean[];
  ready: boolean;
}

export interface View {
  phase: Game['phase'];
  sides: PublicSide[];
  stock: number;
  /** The top few cards of the pile, top card last. */
  pile: Card[];
  pileCount: number;
  burned: number;
  need: Need;
  top: number | null;
  dealer: number;
  turn: number;
  again: boolean;
  log: Entry[];
  winner: number | null;
  /** This phone's seat, or -1 for the table and anyone watching. */
  me: number;
  /** This phone's own hand (empty for the table). */
  hand: Card[];
}

export function viewFor(g: Game, me: number): View {
  return {
    phase: g.phase,
    sides: g.sides.map((s) => ({ hand: s.hand.length, up: s.up, down: s.down.map(Boolean), ready: s.ready })),
    stock: g.stock.length,
    pile: g.pile.slice(-4),
    pileCount: g.pile.length,
    burned: g.burned.length,
    need: g.need,
    top: g.top,
    dealer: g.dealer,
    turn: g.turn,
    again: g.again,
    log: g.log.slice(-4),
    winner: g.winner,
    me,
    hand: g.sides[me]?.hand ?? [],
  };
}
