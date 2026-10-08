import type { GameDefinition } from '../types';
import BusDriver from './BusDriver';

const busDriver: GameDefinition = {
  id: 'bus-driver',
  name: 'Bus Driver',
  emoji: '🚌',
  tagline: 'Guess your cards. Pray you don’t drive the bus.',
  color: 'var(--c-yellow)',
  categories: ['cards', 'pregame', 'party'],
  minPlayers: 2,
  intensity: 3,
  rules: [
    'Pick a dealer. Play starts left of them, the dealer goes last.',
    'Each round, everyone answers one question about the next card, then keeps that card.',
    'Round 1 · Red or black?',
    'Round 2 · Higher or lower than your first card? Same value: drink double.',
    'Round 3 · Inside or outside your first two cards? Hitting one of their values: drink double.',
    'Round 4 · Will the suit be one you already have?',
    'Risky mode adds Round 5 · Guess the exact suit.',
    'Right: give out as many sips as the round number. Wrong: drink them yourself.',
    'Part 2 · The rest of the deck becomes a pyramid (5-4-3-2-1 by default), flipped from the bottom row up.',
    'Hold the same value as the flipped card? Lay it down and give out that row’s sips: 1-2-3-4-5, Tipsy ×2 (1-2-4-8-16) or Tipsy +2 (2-4-6-8-10). Two matching cards = give out twice.',
    'Most cards left at the end drives the bus. A tie goes to a tiebreaker: everyone gets a new card, the deck is flipped, and whoever’s value shows up last drives.',
    'Part 3 · The bus ride, three roads to pick from:',
    'Classic: all five questions (including Which suit?) on a fresh deck, all in a row.',
    'Diamond 1-2-3-2-1: red or black on the bottom card, then higher or lower row by row. Follow the road: only cards touching the one you picked below.',
    '1-2-1-2-1: single cards red or black, pairs higher or lower (pick one).',
    'Wrong answer: drink the question or row number in sips (same value: double), turned cards get covered, start over at the bottom. The ride ends when every question is right in one go.',
  ],
  component: BusDriver,
};

export default busDriver;
