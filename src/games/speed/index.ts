import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Speed from './Speed';

const speed: GameDefinition = {
  id: 'speed',
  name: tx('Speed'),
  emoji: '⚡',
  tagline: tx('A duel for two. Fastest hands win.'),
  color: 'var(--c-indigo)',
  categories: ['cards', 'quick'],
  minPlayers: 2,
  intensity: 1,
  explains: true,
  needs: [tx('A phone for each player')],
  rules: [
    tx('Two players, each on their own phone in the same room. Everyone else can watch the table.'),
    tx('Each gets 20 cards as a face-down pile. The other 12 go into two side stacks of 6.'),
    tx('You may hold at most 5 cards. Draw from your pile whenever you like. Draw too many and you have to put the extras back (last one first) before you can play on.'),
    tx('On 3-2-1 one card from each side stack is turned over into the middle: two piles to play on.'),
    tx('Both play at the same time: a card goes on a middle pile if it’s one higher or lower. Ace goes on King or 2, 2 on Ace or 3.'),
    tx('If neither of you can play, two new cards are turned over on 3-2-1. Once the side stacks run out, every card in the middle is shuffled into two new stacks and you play on.'),
    tx('The first to get rid of all their cards wins.'),
  ],
  online: Speed,
};

export default speed;
