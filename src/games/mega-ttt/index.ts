import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import MegaTicTacToe from './MegaTicTacToe';

const megaTicTacToe: GameDefinition = {
  id: 'mega-ttt',
  table: 'clean',
  name: tx('Mega Tic Tac Toe'),
  emoji: '#️⃣',
  tagline: tx('Nine little boards in a big one. Every move picks where the other plays next.'),
  color: 'var(--c-blue)',
  categories: ['quick'],
  minPlayers: 2,
  maxPlayers: 2,
  picksPlayers: true,
  intensity: 1,
  rules: [
    tx('Nine small boards make one big board. X starts and plays anywhere.'),
    tx('Where you play in a small board sends the other player to the small board in that same place: top right corner, top right board.'),
    tx('Three in a row in a small board wins it: a big X or O, and nobody plays there any more. The other player drinks 1. Full without three in a row, it’s nobody’s.'),
    tx('Sent to a board that’s won or full: play in any open board.'),
    tx('Three small boards in a row win the game. The loser drinks 3 and starts the next one.'),
  ],
  component: MegaTicTacToe,
};

export default megaTicTacToe;
