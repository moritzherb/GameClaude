import { shuffle } from '../../lib/random';

/**
 * A fantasy trick-taking game: in round N everyone gets N cards and says how many tricks they'll
 * take. Hitting it exactly scores; missing costs. Four factions 1–13, four Archmages (always win),
 * four Fools (always lose).
 */

export type Faction = 'fire' | 'water' | 'nature' | 'astral';
export type Card = { id: number; kind: 'number'; faction: Faction; rank: number } | { id: number; kind: 'archmage' | 'fool' };

export const FACTIONS: Faction[] = ['fire', 'water', 'nature', 'astral'];
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

/** How many rounds a full match has: 60 cards shared out. */
export const maxRounds = (players: number) => Math.floor(60 / players);
/** A quick match: the first few rounds only. */
export const QUICK_ROUNDS = 5;

export interface Played {
  seat: number;
  card: Card;
}

export interface Game {
  players: number;
  /** The last round to play. */
  rounds: number;
  round: number;
  dealer: number;
  hands: Card[][];
  /** The card turned up for trump (null: none left to turn). */
  turned: Card | null;
  trump: Faction | null;
  bids: (number | null)[];
  won: number[];
  trick: Played[];
  /** Whose turn: to bid, or to play. */
  turn: number;
  phase: 'trump' | 'bidding' | 'playing' | 'summary' | 'over';
  scores: number[];
  /** Last round's points, per seat (for the summary). */
  gained: number[];
  /** The trick just won and by whom (until the next card). */
  lastTrick: { cards: Played[]; winner: number } | null;
  /** A full trick lies on the table until whoever won it takes it: their seat. */
  taking: number | null;
  /** New with every deal, so every phone deals it out once. */
  dealId: number;
}

export function newDeck(): Card[] {
  const d: Card[] = [];
  let id = 0;
  for (const faction of FACTIONS) for (let rank = 1; rank <= 13; rank++) d.push({ id: id++, kind: 'number', faction, rank });
  for (let k = 0; k < 4; k++) d.push({ id: id++, kind: 'archmage' }, { id: id++, kind: 'fool' });
  return d;
}

const left = (g: Pick<Game, 'players'>, seat: number, by = 1) => (seat + by) % g.players;

export function newGame(players: number, quick = false, deck?: Card[]): Game {
  const rounds = quick ? Math.min(QUICK_ROUNDS, maxRounds(players)) : maxRounds(players);
  const g: Game = { players, rounds, round: 0, dealer: players - 1, hands: [], turned: null, trump: null, bids: [], won: [], trick: [], turn: 0, phase: 'bidding', scores: Array(players).fill(0), gained: Array(players).fill(0), lastTrick: null, taking: null, dealId: 0 };
  return deal(g, deck);
}

/** The next round: the deal moves on, N cards each, a card turned for trump. */
export function deal(g0: Game, deck: Card[] = shuffle(newDeck())): Game {
  const round = g0.round + 1;
  const dealer = left(g0, g0.dealer);
  const hands: Card[][] = Array.from({ length: g0.players }, () => []);
  let rest = [...deck];
  for (let k = 0; k < round; k++) for (let p = 1; p <= g0.players; p++) hands[(dealer + p) % g0.players].push(rest.pop()!);
  const turned = rest.length ? rest.pop()! : null;
  const g: Game = { ...g0, round, dealer, hands, turned, trump: null, bids: Array(g0.players).fill(null), won: Array(g0.players).fill(0), trick: [], lastTrick: null, taking: null, dealId: g0.dealId + 1 + Math.floor(Math.random() * 1e6) * 100, gained: Array(g0.players).fill(0), turn: left(g0, dealer), phase: 'bidding' };
  // A number sets its faction; a Fool (or nothing left) means no trump; an Archmage: the dealer picks.
  if (turned?.kind === 'number') return { ...g, trump: turned.faction };
  if (turned?.kind === 'archmage') return { ...g, phase: 'trump', turn: dealer };
  return g;
}

/** The dealer picks trump after an Archmage was turned. */
export function chooseTrump(g: Game, seat: number, faction: Faction): Game {
  if (g.phase !== 'trump' || seat !== g.dealer) return g;
  return { ...g, trump: faction, phase: 'bidding', turn: left(g, g.dealer) };
}

/** A bid, 0 to the round's number, in turn; locked once made. */
export function bid(g: Game, seat: number, n: number): Game {
  if (g.phase !== 'bidding' || seat !== g.turn || g.bids[seat] != null || n < 0 || n > g.round || !Number.isInteger(n)) return g;
  const bids = g.bids.map((b, i) => (i === seat ? n : b));
  const done = bids.every((b) => b != null);
  return { ...g, bids, turn: done ? left(g, g.dealer) : left(g, seat), phase: done ? 'playing' : 'bidding' };
}

/** The faction the trick follows: the first number card played (null before one). */
export function leadFaction(trick: Played[]): Faction | null {
  const first = trick.find((p) => p.card.kind === 'number');
  return first && first.card.kind === 'number' ? first.card.faction : null;
}

/** Whether a seat may play this card now: following the lead faction if they can (Archmages and
 *  Fools always allowed). */
export function legal(g: Game, seat: number, card: Card): boolean {
  if (g.phase !== 'playing' || seat !== g.turn || g.taking != null) return false;
  if (card.kind !== 'number') return true;
  const lead = leadFaction(g.trick);
  if (!lead || card.faction === lead) return true;
  return !g.hands[seat].some((c) => c.kind === 'number' && c.faction === lead);
}

/** Who takes the trick: the first Archmage; else the highest trump; else the highest of the lead
 *  faction; all Fools: the first Fool. */
export function trickWinner(trick: Played[], trump: Faction | null): number {
  const mage = trick.find((p) => p.card.kind === 'archmage');
  if (mage) return mage.seat;
  const numbers = trick.filter((p) => p.card.kind === 'number') as (Played & { card: Extract<Card, { kind: 'number' }> })[];
  if (!numbers.length) return trick[0].seat;
  const trumps = numbers.filter((p) => p.card.faction === trump);
  const pool = trumps.length ? trumps : numbers.filter((p) => p.card.faction === numbers[0].card.faction);
  return pool.reduce((best, p) => (p.card.rank > best.card.rank ? p : best)).seat;
}

/** Points for a round: exact 20 + 10 per trick, else −10 per trick off. */
export const points = (bidN: number, wonN: number) => (bidN === wonN ? 20 + 10 * bidN : -10 * Math.abs(bidN - wonN));

/** Play a card; the last of a trick decides who wins it, and it waits on the table for them. */
export function playCard(g: Game, seat: number, cardId: number): Game {
  const card = g.hands[seat]?.find((c) => c.id === cardId);
  if (!card || !legal(g, seat, card)) return g;
  const hands = g.hands.map((h, i) => (i === seat ? h.filter((c) => c.id !== cardId) : h));
  const trick = [...g.trick, { seat, card }];
  if (trick.length < g.players) return { ...g, hands, trick, turn: left(g, seat), lastTrick: null };
  const winner = trickWinner(trick, g.trump);
  return { ...g, hands, trick, turn: winner, taking: winner };
}

/** The trick's winner takes it (it goes beside them); they lead the next. The last one settles the round. */
export function takeTrick(g: Game): Game {
  const winner = g.taking;
  if (winner == null) return g;
  const won = g.won.map((w, i) => (i === winner ? w + 1 : w));
  const next: Game = { ...g, trick: [], won, turn: winner, taking: null, lastTrick: { cards: g.trick, winner } };
  if (g.hands.every((h) => !h.length)) {
    const gained = g.bids.map((b, i) => points(b ?? 0, won[i]));
    const scores = g.scores.map((s, i) => s + gained[i]);
    return { ...next, gained, scores, phase: g.round >= g.rounds ? 'over' : 'summary' };
  }
  return next;
}

/** On to the next round after the summary. */
export const nextRound = (g: Game, deck?: Card[]) => (g.phase === 'summary' ? deal(g, deck) : g);
