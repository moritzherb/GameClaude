import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Arschloch from './Arschloch';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';

const arschloch: GameDefinition = {
  id: 'arschloch',
  name: tx('Arschloch'),
  emoji: '💩',
  tagline: tx('Lie about your cards. Don’t end up with four Jacks.'),
  color: 'var(--c-mint)',
  categories: ['cards', 'party'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 2,
  explains: true,
  needs: [tx('Every player’s phone')],
  rules: [
    tx('Everyone joins the same room on their own phone. 32 cards (7 to Ace) lie face down in a circle, like in Kings Cup. The pile goes in the middle.'),
    tx('On your turn, with no cards in your hand, draw one from the circle and look at it. Nobody else may see it.'),
    tx('Lay it face down on the pile and say what it is: the same value as the card before or higher. You may lie.'),
    tx('Cards in your hand? Then you play one of those instead. You only draw from the circle again once your hand is empty.'),
    tx('Only the next player may turn the card before over, before they play. A lie: the liar takes the whole pile. The truth: whoever turned it over takes it.'),
    tx('Whoever takes the pile drinks a sip for every card in it. Whoever turned the card over carries on, and anything goes again.'),
    tx('Four of a value in your hand go out of the game, face down beside it. Whoever lays them down hands out 2 sips.'),
    tx('Whoever ends up with all four Jacks is the Arschloch: empty your glass. The game is over.'),
  ],
  online: Arschloch,
};

export default arschloch;
