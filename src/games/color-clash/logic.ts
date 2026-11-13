import { shuffle } from '../../lib/random';

/**
 * Color Clash: get rid of your hand first. Play a card of the active colour, the same number or the
 * same action; a Choose colour card any time, an Overload only with nothing of the active colour.
 * Or draw one. A Burden (+2) or an Overload (+4) is passed on with another of the same, the
 * penalty growing, until someone takes the lot and plays on.
 */

export type Color = 'crimson' | 'azure' | 'amber' | 'jade';
export type Kind = 'number' | 'block' | 'turnaround' | 'burden' | 'spectrum' | 'overload';

export interface Card {
  id: number;
  /** null: a universal card (Choose colour, Overload). */
  color: Color | null;
  kind: Kind;
  /** A number card's number (0–9). */
  value?: number;
}

export const COLORS: Color[] = ['crimson', 'azure', 'amber', 'jade'];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const HAND = 7;
/** What a Burden and an Overload put on the next player. */
export const PENALTY = { burden: 2, overload: 4 } as const;

export type Entry =
  | { k: 'play'; by: number; card: Card }
  /** Drew `n` cards from the deck: one by choice, or a penalty taken. */
  | { k: 'draw'; by: number; n: number }
  | { k: 'take'; by: number; n: number }
  /** Went down to one card without saying so before the next player moved: draws 2. */
  | { k: 'forgot'; by: number; n: number }
  | { k: 'skip'; by: number }
  | { k: 'called'; by: number };

export interface Game {
  deck: Card[];
  /** The top last. */
  discard: Card[];
  hands: Card[][];
  turn: number;
  dir: 1 | -1;
  /** The active colour (a universal card's chosen one). */
  color: Color;
  /** This turn's player drew this card (playable): play it or keep it. */
  drawn: number | null;
  /** Down to one card just now: whether they said so. Open until the next player moves. */
  lastCard: { seat: number; called: boolean } | null;
  /** A Burden or Overload on the player whose turn it is: answer with another of the same, or take
   *  `n` cards (and then play). */
  penalty: { kind: 'burden' | 'overload'; n: number } | null;
  winner: number | null;
  /** What the last move did, in order (one move can make someone else draw too). */
  events: Entry[];
  /** Counts moves, so every phone animates each one once. */
  seq: number;
}

/** The 108 cards: per colour one 0, two of 1–9, two of each action; four Choose colour, four Overload. */
export function newDeck(): Card[] {
  const d: Card[] = [];
  let id = 0;
  for (const color of COLORS) {
    d.push({ id: id++, color, kind: 'number', value: 0 });
    for (let n = 1; n <= 9; n++) for (let k = 0; k < 2; k++) d.push({ id: id++, color, kind: 'number', value: n });
    for (const kind of ['block', 'turnaround', 'burden'] as const) for (let k = 0; k < 2; k++) d.push({ id: id++, color, kind });
  }
  for (let k = 0; k < 4; k++) {
    d.push({ id: id++, color: null, kind: 'spectrum' });
    d.push({ id: id++, color: null, kind: 'overload' });
  }
  return d;
}

const step = (g: Pick<Game, 'dir' | 'hands'>, from: number, by = 1) => (((from + g.dir * by) % g.hands.length) + g.hands.length) % g.hands.length;

/** Draw n cards for a seat, shuffling the discard pile (but its top) back in when the deck runs out. */
function drawFor(g: Game, seat: number, n: number): Game {
  let deck = [...g.deck];
  let discard = [...g.discard];
  const got: Card[] = [];
  for (let k = 0; k < n; k++) {
    if (!deck.length && discard.length > 1) {
      deck = shuffle(discard.slice(0, -1));
      discard = discard.slice(-1);
    }
    const c = deck.pop();
    if (c) got.push(c);
  }
  return { ...g, deck, discard, hands: g.hands.map((h, i) => (i === seat ? [...h, ...got] : h)) };
}

/** Seven each; the first card turned up (never an Overload) starts the pile and acts on the first player. */
export function newGame(players: number, deck: Card[] = shuffle(newDeck()), pickColor: () => Color = () => COLORS[Math.floor(Math.random() * 4)]): Game {
  let rest = [...deck];
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let k = 0; k < HAND; k++) for (const h of hands) h.push(rest.pop()!);
  let first = rest.pop()!;
  while (first.kind === 'overload') {
    rest = shuffle([first, ...rest]);
    first = rest.pop()!;
  }
  const g: Game = {
    deck: rest,
    discard: [first],
    hands,
    turn: 1 % players,
    dir: 1,
    color: first.color ?? pickColor(),
    drawn: null,
    lastCard: null,
    penalty: null,
    winner: null,
    events: [],
    seq: 0,
  };
  // The first card acts on the first player (left of the dealer, seat 0).
  if (first.kind === 'block') return { ...g, turn: step(g, g.turn), events: [{ k: 'skip', by: g.turn }] };
  if (first.kind === 'turnaround') return { ...g, dir: -1, turn: players === 2 ? 1 : players - 1 };
  if (first.kind === 'burden') return { ...g, penalty: { kind: 'burden', n: PENALTY.burden } };
  return g;
}

export const top = (g: Game) => g.discard[g.discard.length - 1];

/** Whether a seat may play this card now (on their turn). */
export function playable(g: Game, seat: number, card: Card): boolean {
  if (g.winner != null || seat !== g.turn) return false;
  // A penalty on you: only another of the same passes it on.
  if (g.penalty) return card.kind === g.penalty.kind;
  if (g.drawn != null && card.id !== g.drawn) return false;
  const t = top(g);
  if (card.kind === 'spectrum') return true;
  if (card.kind === 'overload') return !g.hands[seat].some((c) => c.color === g.color);
  if (card.color === g.color) return true;
  if (card.kind === 'number') return t.kind === 'number' && t.value === card.value;
  return card.kind === t.kind;
}

/** Someone moves: whoever went down to one card before and didn't say so draws 2 now. */
function moveOn(g: Game, seat: number): Game {
  const l = g.lastCard;
  if (!l || l.seat === seat) return { ...g, events: [], seq: g.seq + 1 };
  const base = { ...g, lastCard: null, events: [] as Entry[], seq: g.seq + 1 };
  if (l.called || g.winner != null) return base;
  return { ...drawFor(base, l.seat, 2), events: [{ k: 'forgot', by: l.seat, n: 2 }] };
}

const say = (g: Game, e: Entry): Game => ({ ...g, events: [...g.events, e] });

/** Play a card (a universal one with the colour chosen). */
export function play(g0: Game, seat: number, cardId: number, chosen?: Color): Game {
  const card = g0.hands[seat]?.find((c) => c.id === cardId);
  if (!card || !playable(g0, seat, card) || (!card.color && !chosen)) return g0;
  let g = moveOn(g0, seat);
  const hand = g.hands[seat].filter((c) => c.id !== cardId);
  g = say({ ...g, hands: g.hands.map((h, i) => (i === seat ? hand : h)), discard: [...g.discard, card], color: card.color ?? chosen!, drawn: null }, { k: 'play', by: seat, card });
  // Out of cards: that's the game (a penalty played last doesn't matter any more).
  if (!hand.length) return { ...g, winner: seat, lastCard: null, penalty: null };
  // Down to one: say so before the next player moves.
  g = { ...g, lastCard: hand.length === 1 ? { seat, called: false } : g.lastCard?.seat === seat ? null : g.lastCard };
  const next = step(g, seat);
  switch (card.kind) {
    case 'turnaround': {
      const dir = (g.dir * -1) as 1 | -1;
      // With two it's a Block too.
      return { ...g, dir, turn: g.hands.length === 2 ? seat : step({ ...g, dir }, seat) };
    }
    case 'block':
      return say({ ...g, turn: step(g, seat, 2) }, { k: 'skip', by: next });
    case 'burden':
    case 'overload':
      // On to the next one, the penalty growing: pass it on with the same, or take it.
      return { ...g, turn: next, penalty: { kind: card.kind, n: (g.penalty?.n ?? 0) + PENALTY[card.kind] } };
    default:
      return { ...g, turn: next };
  }
}

/** A penalty on you: take all its cards, then it's your turn to play. */
export function take(g0: Game, seat: number): Game {
  const p = g0.penalty;
  if (!p || g0.winner != null || seat !== g0.turn) return g0;
  const g = moveOn(g0, seat);
  return say({ ...drawFor(g, seat, p.n), penalty: null, lastCard: g.lastCard?.seat === seat ? null : g.lastCard }, { k: 'take', by: seat, n: p.n });
}

/** Nothing to play (or rather not): draw one. Playable, it may go down at once; else the turn passes. */
export function draw(g0: Game, seat: number): Game {
  if (g0.winner != null || g0.penalty || seat !== g0.turn || g0.drawn != null) return g0;
  let g = moveOn(g0, seat);
  const before = g.hands[seat].length;
  g = say(drawFor(g, seat, 1), { k: 'draw', by: seat, n: 1 });
  // Holding two again: nothing to say any more.
  if (g.lastCard?.seat === seat) g = { ...g, lastCard: null };
  const got = g.hands[seat].length > before ? g.hands[seat][g.hands[seat].length - 1] : null;
  if (got && playable({ ...g, drawn: got.id }, seat, got)) return { ...g, drawn: got.id };
  return { ...g, drawn: null, turn: step(g, seat) };
}

/** Drew a playable card but keeps it. */
export function pass(g: Game, seat: number): Game {
  if (seat !== g.turn || g.drawn == null) return g;
  return { ...g, drawn: null, turn: step(g, seat), events: [], seq: g.seq + 1 };
}

/** "Last card!": right after going down to one, before the next player moves. */
export function callLast(g: Game, seat: number): Game {
  if (g.lastCard?.seat !== seat || g.lastCard.called) return g;
  return { ...g, lastCard: { seat, called: true }, events: [{ k: 'called', by: seat }], seq: g.seq + 1 };
}
