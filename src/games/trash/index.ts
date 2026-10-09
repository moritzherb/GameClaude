import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Trash from './Trash';

const trash: GameDefinition = {
  id: 'trash',
  name: tx('Trash'),
  emoji: '🗑️',
  tagline: tx('Turn your ten cards over first. Then do it with nine.'),
  color: 'var(--c-red)',
  categories: ['cards', 'quick'],
  minPlayers: 2,
  intensity: 1,
  explains: true,
  rules: [
    tx('A duel for two. Each player gets 10 face-down cards in two rows: slots Ace to 5 on top, 6 to 10 below. The rest is the stock.'),
    tx('The dealer deals the other player first, and that player starts.'),
    tx('On your turn, take the top card of the stock, or the top of the discard pile if you can use it.'),
    tx('A card goes face up into its own slot if that slot is still face down. Pick up the card that lay there and play it the same way, and so on.'),
    tx('A Jack is wild: put it into any face-down slot. Queens and Kings are useless.'),
    tx('A card you can’t use goes on the discard pile, and it’s the other player’s turn.'),
    tx('Turn all your slots over first to win the round. Next round the winner gets one card fewer and deals, so the loser starts.'),
    tx('Win a round with just one card and you win the game.'),
  ],
  component: Trash,
};

export default trash;
