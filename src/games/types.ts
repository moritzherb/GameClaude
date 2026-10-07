import type { ComponentType } from 'react';
import type { Player } from '../state/AppState';

export type CategoryId = 'pregame' | 'party' | 'quick' | 'cards' | 'dice' | 'teams';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'pregame', label: 'Pregame', emoji: '🔥', color: 'var(--orange)' },
  { id: 'party', label: 'Party', emoji: '🎉', color: 'var(--pink)' },
  { id: 'quick', label: 'Quick', emoji: '⚡', color: 'var(--yellow)' },
  { id: 'cards', label: 'Cards', emoji: '🃏', color: 'var(--cyan)' },
  { id: 'dice', label: 'Dice', emoji: '🎲', color: 'var(--lime)' },
  { id: 'teams', label: 'Teams', emoji: '🤝', color: 'var(--purple)' },
];

/** Props every game screen receives from the game shell. */
export interface GameProps {
  players: Player[];
  /** Leave the game and go back to its info page. */
  exit: () => void;
}

/**
 * One entry in the game library. To add a game: create a folder in src/games/,
 * export a GameDefinition from its index.ts, and add it to registry.ts.
 */
export interface GameDefinition {
  id: string;
  name: string;
  emoji: string;
  /** One punchy line shown on the card. */
  tagline: string;
  /** Card background colour (CSS value). */
  color: string;
  categories: CategoryId[];
  minPlayers: number;
  maxPlayers?: number;
  /** How hard it hits: 1 = chill, 2 = tipsy, 3 = dangerous. */
  intensity: 1 | 2 | 3;
  /** Props needed besides drinks, e.g. "Deck of cards". */
  needs?: string[];
  /** Short rules, one step per entry. Shown before starting and via the ? button in-game. */
  rules: string[];
  /** The playable screen. Omit to show the game as "coming soon". */
  component?: ComponentType<GameProps>;
}
