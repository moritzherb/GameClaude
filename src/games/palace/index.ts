import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';
import Palace from './Palace';

const palace: GameDefinition = {
  id: 'palace',
  name: tx('Palace'),
  emoji: '🏰',
  tagline: tx('Same or higher. First one out of cards wins.'),
  color: 'var(--c-orange)',
  categories: ['cards', 'party'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 1,
  explains: true,
  needs: [tx('Every player’s phone, plus one for the table')],
  rules: [
    tx('Everyone joins the same room on their own phone. The host’s phone lies in the middle as the table. One deck of 52 cards, 2 to 5 players.'),
    tx('Dealt one at a time, starting left of the dealer: three face-down cards each, then six hand cards. Everyone lays three of their hand cards face up on their face-down ones.'),
    tx('Starting left of the dealer, play one card or several of the same value onto the pile: the same value or higher. While the stock lasts, draw back up to three hand cards.'),
    tx('Can’t play? Take the whole pile, or risk it: the top card of the stock goes on the pile. If it fits, you got lucky. If not, you take the pile and that card.'),
    tx('Once the stock is gone and your hand is empty, play your face-up cards, then your face-down ones, blind, one at a time. If one doesn’t fit, you take the pile and have to play your hand first again.'),
    tx('2, 3 and 10 can always be played, and so can four of a kind.'),
    tx('7: the next player has to play 7 or lower. After that it’s 7 or higher again. A 7 only goes on 7 or lower.'),
    tx('10 or four of a kind: the pile is cleared away. Draw up and play again.'),
    tx('2: start again from 2. The pile stays, and you play again without drawing first.'),
    tx('3: copies the card it lies on, specials too. On a 7 the next player plays 7 or lower, on a 2 you play again.'),
    tx('The first player with no cards left wins.'),
  ],
  online: Palace,
};

export default palace;
