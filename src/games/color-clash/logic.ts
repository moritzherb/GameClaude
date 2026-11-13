import { shuffle } from '../../lib/random';

/**
 * Color Clash: get rid of your hand first. Play a card of the active colour, the same number or the
 * same action; Spectrum any time, Overload only with nothing of the active colour. Or draw one.
 */

export type Color = 'crimson' | 'azure' | 'amber' | 'jade';
export type Kind = 'number' | 'block' | 'turnaround' | 'burden' | 'spectrum' | 'overload';

export interface Card {
  id: number;
  /** null: a universal card (Spectrum, Overload). */
  color: Color | null;
  kind: Kind;
  /** A number card's number (0–9). */
  value?: number;
}

export const COLORS: Color[] = ['crimson', 'azure', 'amber', 'jade'];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const HAND = 7;

export type Entry =
  | { k: 'play'; by: number; card: Card }
  | { k: 'draw'; by: number; n: number }
  | { k: 'skip'; by: number; draws: number }
  | { k: 'caught'; by: number; caller: number }
  | { k: 'called'; by: number }
  | { k: 'challenge'; by: number; actor: number; fair: boolean };

export interface Game {
  deck: Card[];
  /** The top last. */
  discard: Card[];
  hands: Card[][];
  turn: number;
  dir: 1 | -1;
  /** The active colour (a universal card's chosen one). */
  color: Color;
  /** This turn's player drew this card (playable): play it or pass. */
  drawn: number | null;
  /** Down to one card: whether they said so, until the next player acts. */
  lastCard: { seat: number; called: boolean } | null;
  /** Said "last card" ahead, while still holding two (before playing the second-last). */
  calling: number | null;
  /** An Overload the next player can take or challenge. `fair`: the one who played it had nothing
   *  of the colour before it (so a challenge fails). */
  overload: { actor: number; target: number; fair: boolean } | null;
  winner: number | null;
  last: Entry | null;
}

/** The 108 cards: per colour one 0, two of 1–9, two of each action; four Spectrum, four Overload. */
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
  let g: Game = { deck: rest, discard: [first], hands, turn: 1 % players, dir: 1, color: first.color ?? pickColor(), drawn: null, lastCard: null, calling: null, overload: null, winner: null, last: null };
  // The first card acts on the first player (left of the dealer, seat 0).
  if (first.kind === 'block') g = { ...g, turn: step(g, g.turn) };
  else if (first.kind === 'turnaround') g = { ...g, dir: -1, turn: players === 2 ? 1 : players - 1 };
  else if (first.kind === 'burden') g = { ...drawFor(g, g.turn, 2), turn: step(g, g.turn) };
  return g;
}

export const top = (g: Game) => g.discard[g.discard.length - 1];

/** Whether a seat may play this card now (on their turn). */
export function playable(g: Game, seat: number, card: Card): boolean {
  if (g.winner != null || g.overload || seat !== g.turn) return false;
  if (g.drawn != null && card.id !== g.drawn) return false;
  const t = top(g);
  if (card.kind === 'spectrum') return true;
  if (card.kind === 'overload') return !g.hands[seat].some((c) => c.color === g.color);
  if (card.color === g.color) return true;
  if (card.kind === 'number') return t.kind === 'number' && t.value === card.value;
  return card.kind === t.kind;
}

/** Someone else acting ends the chance to catch whoever is down to one card. */
const moveOn = (g: Game, seat: number): Game => (g.lastCard && g.lastCard.seat !== seat ? { ...g, lastCard: null } : g);

/** Play a card (a universal one with the colour chosen). */
export function play(g0: Game, seat: number, cardId: number, chosen?: Color): Game {
  const card = g0.hands[seat]?.find((c) => c.id === cardId);
  if (!card || !playable(g0, seat, card) || (!card.color && !chosen)) return g0;
  let g = moveOn(g0, seat);
  const fair = card.kind === 'overload' ? !g.hands[seat].some((c) => c.id !== card.id && c.color === g.color) : true;
  const hand = g.hands[seat].filter((c) => c.id !== cardId);
  g = { ...g, hands: g.hands.map((h, i) => (i === seat ? hand : h)), discard: [...g.discard, card], color: card.color ?? chosen!, drawn: null, last: { k: 'play', by: seat, card } };
  if (hand.length === 1) g = { ...g, lastCard: { seat, called: g.calling === seat } };
  g = { ...g, calling: null };
  const next = step(g, seat);
  if (!hand.length) {
    // Out: a Burden or Overload still makes the next one draw.
    if (card.kind === 'burden') g = drawFor(g, next, 2);
    if (card.kind === 'overload') g = drawFor(g, next, 4);
    return { ...g, winner: seat, lastCard: null };
  }
  switch (card.kind) {
    case 'turnaround': {
      const dir = (g.dir * -1) as 1 | -1;
      // With two it's a Block too.
      return { ...g, dir, turn: g.hands.length === 2 ? seat : step({ ...g, dir }, seat) };
    }
    case 'block':
      return { ...g, turn: step(g, seat, 2), last: { k: 'skip', by: next, draws: 0 } };
    case 'burden':
      return { ...drawFor(g, next, 2), turn: step(g, seat, 2), last: { k: 'skip', by: next, draws: 2 } };
    case 'overload':
      // The next one decides: take it, or challenge.
      return { ...g, turn: next, overload: { actor: seat, target: next, fair } };
    default:
      return { ...g, turn: next };
  }
}

/** Nothing to play (or rather not): draw one. Playable, it may go down at once; else the turn passes. */
export function draw(g0: Game, seat: number): Game {
  if (g0.winner != null || g0.overload || seat !== g0.turn || g0.drawn != null) return g0;
  let g = drawFor(moveOn(g0, seat), seat, 1);
  const got = g.hands[seat][g.hands[seat].length - 1];
  g = { ...g, calling: null, last: { k: 'draw', by: seat, n: 1 } };
  if (got && got !== g0.hands[seat][g0.hands[seat].length - 1] && playable({ ...g, drawn: got.id }, seat, got)) return { ...g, drawn: got.id };
  return { ...g, drawn: null, turn: step(g, seat) };
}

/** Drew a playable card but keeps it. */
export function pass(g: Game, seat: number): Game {
  if (seat !== g.turn || g.drawn == null) return g;
  return { ...g, drawn: null, turn: step(g, seat) };
}

/** "Last card!": said with two left on your turn (before playing), or right after going down to one. */
export function callLast(g: Game, seat: number): Game {
  if (g.lastCard?.seat === seat && !g.lastCard.called) return { ...g, lastCard: { seat, called: true }, last: { k: 'called', by: seat } };
  if (g.turn === seat && g.hands[seat].length === 2) return { ...g, calling: seat, last: { k: 'called', by: seat } };
  return g;
}

/** Caught someone at one card who didn't say so: they draw two. */
export function catchLast(g: Game, by: number): Game {
  const l = g.lastCard;
  if (!l || l.called || l.seat === by) return g;
  return { ...drawFor(g, l.seat, 2), lastCard: null, last: { k: 'caught', by, caller: l.seat } };
}

/** The Overload's target takes it: draws four and is skipped. */
export function acceptOverload(g: Game, seat: number): Game {
  const o = g.overload;
  if (!o || o.target !== seat) return g;
  return { ...drawFor(g, seat, 4), overload: null, turn: step(g, seat), last: { k: 'skip', by: seat, draws: 4 } };
}

/** Challenges it: played unfairly, the one who did draws four (and the target plays on); fairly,
 *  the challenger draws six and is skipped. */
export function challengeOverload(g: Game, seat: number): Game {
  const o = g.overload;
  if (!o || o.target !== seat) return g;
  if (!o.fair) return { ...drawFor(g, o.actor, 4), overload: null, turn: seat, last: { k: 'challenge', by: seat, actor: o.actor, fair: false } };
  return { ...drawFor(g, seat, 6), overload: null, turn: step(g, seat), last: { k: 'challenge', by: seat, actor: o.actor, fair: true } };
}
