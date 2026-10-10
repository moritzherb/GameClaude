import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import HoseRunter from './HoseRunter';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';

const hoseRunter: GameDefinition = {
  id: 'hose-runter',
  name: tx('Pants Down'),
  emoji: '👖',
  tagline: tx('Three cards, one suit, don’t be lowest.'),
  color: 'var(--c-blue)',
  categories: ['cards', 'party'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 1,
  explains: true,
  needs: [tx('Every player’s phone')],
  rules: [
    tx('Everyone joins the same room on their own phone. The host’s phone lies in the middle as the table. Cards 7 to Ace, three each.'),
    tx('Points: add up the cards of ONE suit. 7–10 = face value, J/Q/K = 10, Ace = 11.'),
    tx('The dealer looks at their three first: keep them (three more go to the middle) or put them in the middle and play the next three.'),
    tx('Starting left of the dealer: swap one card with the middle, swap all three, or say STOP. No Stop in the first round.'),
    tx('Optional for big groups: passing (“schieben”) instead of swapping, switched on before dealing.'),
    tx('After a Stop everyone else gets one more turn, then all cards are shown.'),
    tx('31 in one suit = Pants down 👖 and three aces = Fire 🔥: the round ends at once.'),
    tx('Any other three of a kind = 30½.'),
    // 5 = START_LIVES (written out: rules are translated as whole sentences).
    tx('Lowest points loses a life (ties all lose). 5 lives each.'),
    tx('The first to hit zero gets one extra life (everyone who hits zero in that same round does). After that, zero means you’re out.'),
    tx('If the last players would all go out at once, nobody does: they play a decider round. Last one standing wins.'),
  ],
  online: HoseRunter,
};

export default hoseRunter;
