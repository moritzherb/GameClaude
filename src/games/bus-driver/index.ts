import type { GameDefinition } from '../types';
import BusDriver from './BusDriver';

const busDriver: GameDefinition = {
  id: 'bus-driver',
  name: 'Bus Driver',
  emoji: '🚌',
  tagline: 'Guess your cards. Pray you don’t drive the bus.',
  color: 'var(--g-gold)',
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
  ],
  component: BusDriver,
};

export default busDriver;
