import { newDeck, type Card } from '../../lib/cards';
import { pick, shuffle } from '../../lib/random';

/*
 * Hose runter – rules
 * - 32 cards (7 to Ace). 7–10 count their value, J/Q/K count 10, Ace counts 11.
 * - A hand scores the highest sum of cards of one suit (♥7 ♥10 ♦8 = 17).
 *   Three of a kind (not aces) = 30½. Three aces = Feuer (beats everything).
 *   31 (two ten-cards + ace of one suit) = Hose runter: the round ends at once. So does Feuer.
 * - The dealer looks at their first three cards and keeps them (three more go to the middle)
 *   or puts them in the middle and must play the next three.
 * - Turns start left of the dealer: swap one card with the middle, swap all three, or (not in the
 *   first round of turns) say Stop. After a Stop everyone else gets one more turn.
 *   Optional house rule for big groups: pass ("schieben") instead of swapping.
 * - Lowest score loses a life (all tied lowest do). 5 lives. The first player to hit 0 gets one
 *   extra life (all of them if several hit 0 together); anyone after that is out. If everyone left
 *   would go out at once (a tie at the end), nobody goes out and a decider round is played.
 *   Last one standing wins.
 */

export const START_LIVES = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8; // 8 × 3 + 3 middle + 3 for the dealer's swap = 30 of 32 cards

export type HandKind = 'feuer' | 'hose' | 'triple' | 'suit';

export interface Score {
  points: number;
  kind: HandKind;
}

export interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lives: number;
  out: boolean;
}

export type Action =
  | { type: 'keep' }
  | { type: 'toss' }
  | { type: 'swap1'; hand: number; middle: number }
  | { type: 'swapAll' }
  | { type: 'stop' }
  | { type: 'pass' }
  | { type: 'next' };

export type LogEntry =
  | { by: string; kind: 'keep' | 'toss' | 'swapAll' | 'stop' | 'pass' }
  | { by: string; kind: 'swap1'; gave: Card; took: Card };

export interface RoundResult {
  endedBy: 'stop' | 'hose' | 'feuer';
  /** Who ended it with Hose runter / Feuer. */
  by: string | null;
  hands: Record<string, Card[]>;
  scores: Record<string, Score>;
  losers: string[];
  /** Got the one-time extra life this round. */
  extraLife: string[];
  /** Knocked out this round. */
  out: string[];
  /** Everyone left would have gone out at once: they stay in on one life and play a decider. */
  decider: boolean;
}

export interface GameState {
  seats: Seat[];
  round: number;
  dealerId: string;
  extraLifeGiven: boolean;
  /** House rule: a player may pass ("schieben") instead of swapping. */
  allowPass: boolean;
  phase: 'dealer' | 'turns' | 'reveal' | 'over';
  deck: Card[];
  hands: Record<string, Card[]>;
  middle: Card[];
  turnId: string;
  /** Turns played this round (Stop is allowed once everyone has had one). */
  turns: number;
  stopperId: string | null;
  log: LogEntry[];
  result: RoundResult | null;
  winnerId: string | null;
}

/* ---------------- Cards & scoring ---------------- */

export function hoseDeck(): Card[] {
  return newDeck().filter((c) => c.value >= 7);
}

export function cardPoints(c: Card) {
  if (c.value === 14) return 11;
  return Math.min(c.value, 10);
}

export function scoreHand(hand: Card[]): Score {
  if (hand.length === 3 && hand.every((c) => c.value === hand[0].value)) {
    return hand[0].value === 14 ? { points: 33, kind: 'feuer' } : { points: 30.5, kind: 'triple' };
  }
  const bySuit = new Map<string, number>();
  for (const c of hand) bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + cardPoints(c));
  const points = Math.max(0, ...bySuit.values());
  return { points, kind: points === 31 ? 'hose' : 'suit' };
}

export function formatPoints(points: number) {
  return points === 30.5 ? '30½' : String(points);
}

/* ---------------- Seats & turn order ---------------- */

const active = (s: GameState) => s.seats.filter((x) => !x.out);

/** Next player still in the game, clockwise (seat order), after `id`. */
export function nextActive(s: GameState, id: string) {
  const i = s.seats.findIndex((x) => x.id === id);
  for (let k = 1; k <= s.seats.length; k++) {
    const seat = s.seats[(i + k) % s.seats.length];
    if (!seat.out) return seat.id;
  }
  return id;
}

export function canStop(s: GameState, id: string) {
  return s.phase === 'turns' && s.turnId === id && !s.stopperId && s.turns >= active(s).length;
}

/* ---------------- Game flow ---------------- */

export function newGame(
  players: Omit<Seat, 'lives' | 'out'>[],
  deck: Card[] = shuffle(hoseDeck()),
  options: { allowPass?: boolean } = {},
): GameState {
  const seats = players.map((p) => ({ ...p, lives: START_LIVES, out: false }));
  const base: GameState = {
    seats,
    round: 1,
    dealerId: pick(seats).id,
    extraLifeGiven: false,
    allowPass: !!options.allowPass,
    phase: 'dealer',
    deck: [],
    hands: {},
    middle: [],
    turnId: '',
    turns: 0,
    stopperId: null,
    log: [],
    result: null,
    winnerId: null,
  };
  return deal(base, deck);
}

/** Deals three cards to each player, starting left of the dealer; the dealer gets theirs last. */
export function deal(s: GameState, deck: Card[] = shuffle(hoseDeck())): GameState {
  const order: string[] = [];
  let id = s.dealerId;
  do {
    id = nextActive(s, id);
    order.push(id);
  } while (id !== s.dealerId);
  const rest = [...deck];
  const hands: Record<string, Card[]> = {};
  for (const pid of order) hands[pid] = rest.splice(0, 3);
  return { ...s, phase: 'dealer', deck: rest, hands, middle: [], turnId: s.dealerId, turns: 0, stopperId: null, log: [], result: null };
}

/** Applies a player's action. Invalid actions return the state unchanged. */
export function applyAction(s: GameState, playerId: string, a: Action): GameState {
  switch (a.type) {
    case 'keep':
    case 'toss': {
      if (s.phase !== 'dealer' || playerId !== s.dealerId) return s;
      const deck = [...s.deck];
      const next3 = deck.splice(0, 3);
      const hands = { ...s.hands };
      let middle: Card[];
      if (a.type === 'keep') middle = next3;
      else {
        middle = hands[playerId];
        hands[playerId] = next3;
      }
      const after: GameState = {
        ...s,
        deck,
        hands,
        middle,
        phase: 'turns',
        turnId: nextActive(s, s.dealerId),
        log: [{ by: playerId, kind: a.type }],
      };
      // Dealt a Hose runter or Feuer? The round is over right away.
      const lucky = active(after).find((x) => isInstant(scoreHand(after.hands[x.id])));
      return lucky ? endRound(after, lucky.id) : after;
    }

    case 'swap1':
    case 'swapAll': {
      if (s.phase !== 'turns' || playerId !== s.turnId) return s;
      const hand = [...s.hands[playerId]];
      const middle = [...s.middle];
      let entry: LogEntry;
      if (a.type === 'swap1') {
        if (!(a.hand in hand) || !(a.middle in middle)) return s;
        const gave = hand[a.hand];
        const took = middle[a.middle];
        hand[a.hand] = took;
        middle[a.middle] = gave;
        entry = { by: playerId, kind: 'swap1', gave, took };
      } else {
        entry = { by: playerId, kind: 'swapAll' };
        const old = hand.splice(0, 3, ...middle);
        middle.splice(0, 3, ...old);
      }
      const after = { ...s, hands: { ...s.hands, [playerId]: hand }, middle, log: [...s.log, entry].slice(-8) };
      if (isInstant(scoreHand(hand))) return endRound(after, playerId);
      return advance(after);
    }

    case 'stop': {
      if (!canStop(s, playerId)) return s;
      return advance({ ...s, stopperId: playerId, log: [...s.log, { by: playerId, kind: 'stop' as const }].slice(-8) });
    }

    case 'pass': {
      if (!s.allowPass || s.phase !== 'turns' || playerId !== s.turnId) return s;
      return advance({ ...s, log: [...s.log, { by: playerId, kind: 'pass' as const }].slice(-8) });
    }

    case 'next': {
      if (s.phase !== 'reveal') return s;
      return nextRound(s);
    }
  }
}

const isInstant = (score: Score) => score.kind === 'hose' || score.kind === 'feuer';

function advance(s: GameState): GameState {
  const next = nextActive(s, s.turnId);
  const turns = s.turns + 1;
  if (s.stopperId && next === s.stopperId) return endRound({ ...s, turns }, null);
  return { ...s, turns, turnId: next };
}

export function endRound(s: GameState, instantBy: string | null): GameState {
  const players = active(s);
  const scores: Record<string, Score> = {};
  for (const p of players) scores[p.id] = scoreHand(s.hands[p.id]);
  const low = Math.min(...players.map((p) => scores[p.id].points));
  const losers = players.filter((p) => scores[p.id].points === low).map((p) => p.id);

  const extraLife: string[] = [];
  let out: string[] = [];
  let seats = s.seats.map((seat) => {
    if (!losers.includes(seat.id)) return seat;
    const lives = seat.lives - 1;
    if (lives > 0) return { ...seat, lives };
    if (!s.extraLifeGiven) {
      extraLife.push(seat.id);
      return { ...seat, lives: 1 };
    }
    out.push(seat.id);
    return { ...seat, lives: 0, out: true };
  });

  // Nobody left standing? Then it was a tie at the very end: they all stay in on one life
  // and play a decider round.
  const decider = out.length > 0 && seats.every((x) => x.out);
  if (decider) {
    seats = seats.map((x) => (out.includes(x.id) ? { ...x, lives: 1, out: false } : x));
    out = [];
  }

  const left = seats.filter((x) => !x.out);
  const endedBy = instantBy ? (scores[instantBy].kind === 'feuer' ? 'feuer' : 'hose') : 'stop';
  return {
    ...s,
    seats,
    extraLifeGiven: s.extraLifeGiven || extraLife.length > 0,
    phase: left.length <= 1 ? 'over' : 'reveal',
    winnerId: left.length === 1 ? left[0].id : null,
    result: { endedBy, by: instantBy, hands: Object.fromEntries(players.map((p) => [p.id, s.hands[p.id]])), scores, losers, extraLife, out, decider },
  };
}

export function nextRound(s: GameState, deck?: Card[]): GameState {
  // The deal moves on to the next player still in the game.
  const dealerId = nextActive(s, s.dealerId);
  return deal({ ...s, round: s.round + 1, dealerId }, deck);
}

/* ---------------- What each phone may see ---------------- */

export interface PlayerView {
  seats: Seat[];
  round: number;
  dealerId: string;
  phase: GameState['phase'];
  middle: Card[];
  turnId: string;
  stopperId: string | null;
  log: LogEntry[];
  result: RoundResult | null;
  winnerId: string | null;
  allowPass: boolean;
  /** This phone's own cards (empty for spectators and players who are out). */
  hand: Card[];
  canStop: boolean;
  /** True while Stop is blocked because not everyone has had a turn yet. */
  firstLap: boolean;
}

export function viewFor(s: GameState, viewerId: string): PlayerView {
  return {
    seats: s.seats,
    round: s.round,
    dealerId: s.dealerId,
    phase: s.phase,
    middle: s.middle,
    turnId: s.turnId,
    stopperId: s.stopperId,
    log: s.log,
    result: s.result,
    winnerId: s.winnerId,
    allowPass: s.allowPass,
    hand: s.hands[viewerId] ?? [],
    canStop: canStop(s, viewerId),
    firstLap: s.turns < active(s).length,
  };
}
