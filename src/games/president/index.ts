import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import President from './President';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';

const president: GameDefinition = {
  id: 'president',
  name: tx('President'),
  emoji: '👑',
  tagline: tx('Get rid of your cards. Don’t be the last one.'),
  color: 'var(--c-mint)',
  categories: ['cards', 'party'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 2,
  explains: true,
  needs: [tx('Every player’s phone')],
  rules: [
    tx('Everyone joins the same room on their own phone. 32 cards (7 to Ace, Ace highest), 3 to 6 players, all dealt out.'),
    tx('The first round, whoever holds the 7 of clubs starts. After that the Arschloch starts.'),
    tx('Lead one card or several of the same value. Then, in turn, play as many cards of a higher value, or pass.'),
    tx('Passing costs a sip. You may still play on your next turn.'),
    tx('Once everyone else has passed, the trick is closed: whoever played last hands out a sip and leads. An Ace closes the trick right away.'),
    tx('Out of cards: you’re out, the earlier the better. The last one with cards is the Arschloch.'),
    tx('Ranks: President, Vice President, citizens, Vice Arschloch, Arschloch. With 3 players there are no vices.'),
    tx('End of the round: the Arschloch drinks 3, the Vice Arschloch 2. The President hands out 3, the Vice President 2.'),
    tx('Next round: the Arschloch gives their 2 best cards to the President, the Vice Arschloch their best one to the Vice President. They give any cards of their choice back.'),
  ],
  online: President,
};

export default president;
