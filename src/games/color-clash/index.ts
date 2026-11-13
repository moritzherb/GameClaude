import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import ColorClash from './ColorClash';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';

const colorClash: GameDefinition = {
  id: 'color-clash',
  name: tx('Color Clash'),
  emoji: '🟥',
  tagline: tx('Match the colour, the number or the action. Empty your hand first.'),
  color: 'var(--c-red)',
  categories: ['cards', 'party'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 1,
  explains: true,
  table: 'full',
  needs: [tx('Every player’s phone')],
  rules: [
    tx('Everyone joins the same room on their own phone. 108 cards in four colours (Crimson, Azure, Amber, Jade), seven each; one card starts the pile.'),
    tx('In turn, play a card of the active colour, the same number or the same action. Or draw one: if it fits, you may play it at once.'),
    tx('Block: the next player sits out. Turnaround: the direction changes (with two, it’s a Block).'),
    tx('Burden (+2) and Overload (+4): the next player passes it on with another of the same, the cards adding up (+4, +6… or +8, +12…), or takes them all and then plays. No Burden on an Overload, no Overload on a Burden.'),
    tx('Choose colour: play it any time and choose the colour. Overload: only with nothing of the active colour; you choose the colour too.'),
    tx('Down to one card: tap “Last card!” right after playing, before the next player moves. Forgot? You draw 2.'),
    tx('First one out of cards wins.'),
  ],
  online: ColorClash,
};

export default colorClash;
