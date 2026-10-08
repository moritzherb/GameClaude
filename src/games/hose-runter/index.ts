import type { GameDefinition } from '../types';
import HoseRunter from './HoseRunter';
import { MAX_PLAYERS, MIN_PLAYERS, START_LIVES } from './logic';

const hoseRunter: GameDefinition = {
  id: 'hose-runter',
  name: 'Hose runter',
  emoji: '👖',
  tagline: 'Three cards, one suit, don’t be lowest.',
  color: 'var(--c-blue)',
  categories: ['cards', 'party'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 2,
  needs: ['Every player’s phone'],
  rules: [
    'Everyone joins the same room on their own phone. Cards 7 to Ace, three each.',
    'Points: add up the cards of ONE suit. 7–10 = face value, J/Q/K = 10, Ace = 11.',
    'The dealer looks at their three first: keep them (three more go to the middle) or put them in the middle and play the next three.',
    'Starting left of the dealer: swap one card with the middle, swap all three, or say STOP. No Stop in the first round.',
    'After a Stop everyone else gets one more turn, then all cards are shown.',
    '31 in one suit = Hose runter 👖 and three aces = Feuer 🔥: the round ends at once.',
    'Any other three of a kind = 30½.',
    `Lowest points loses a life (ties all lose). ${START_LIVES} lives each. The first one to hit zero gets one extra life, after that you’re out. Last one standing wins.`,
  ],
  online: HoseRunter,
};

export default hoseRunter;
