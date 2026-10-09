import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import HorseRace from './HorseRace';

const horseRace: GameDefinition = {
  id: 'horse-race',
  name: tx('Horse Race'),
  emoji: '🏇',
  tagline: tx('Bet on an Ace. Pray it gallops.'),
  color: 'var(--c-teal)',
  categories: ['cards', 'party', 'quick'],
  minPlayers: 2,
  intensity: 2,
  explains: true,
  rules: [
    tx('The four Aces are the horses, side by side at the start. Next to the track lies one face-down card per row (you pick how many rows).'),
    tx('Everyone bets on a suit: its Ace is your horse.'),
    tx('Turn over the rest of the deck card by card. Each card moves the Ace of its suit up one row.'),
    tx('The first Ace into a row turns that row’s side card over, and the Ace of its suit moves up too, before the next card from the deck.'),
    tx('Whoever bet on the Ace that turned the side card over gives out sips: as many as the row number.'),
    tx('The first Ace past the top row wins. Its backers drink nothing; everyone else drinks one sip for every row their horse is behind.'),
  ],
  component: HorseRace,
};

export default horseRace;
