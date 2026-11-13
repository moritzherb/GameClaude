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
    tx('Block: the next player sits out. Turnaround: the direction changes (with two, it’s a Block). Burden: the next player draws 2 and sits out.'),
    tx('Spectrum: play it any time and choose the colour. Overload: only with nothing of the active colour; choose the colour, the next player draws 4 and sits out.'),
    tx('An Overload can be challenged: if the player still had a card of the colour before, they draw 4; if not, the challenger draws 6.'),
    tx('Down to one card: say “Last card!” (tap it) before the next player moves, or anyone can catch you: draw 2.'),
    tx('First one out of cards wins.'),
  ],
  online: ColorClash,
};

export default colorClash;
