import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import RatScrew from './RatScrew';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';

const ratScrew: GameDefinition = {
  id: 'rat-screw',
  name: tx('Egyptian Rat Screw'),
  emoji: '🐀',
  tagline: tx('Play, watch, slap. The first hand on the pile takes it.'),
  color: 'var(--c-orange)',
  categories: ['cards', 'quick'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 2,
  explains: true,
  table: 'full',
  needs: [tx('Every player’s phone')],
  rules: [
    tx('Everyone joins the same room on their own phone. All 52 cards (with Jokers, if you like) are dealt out; nobody looks at theirs.'),
    tx('In turn, from left of the dealer, play the top card of your pile into the middle.'),
    tx('A face card or an Ace: the next player has to answer with one. A Jack gives 1 try, a Queen 2, a King 3, an Ace 4.'),
    tx('Answered: the next player has to answer that one. Not answered in time: whoever played the last face card or Ace takes the whole pile and starts.'),
    tx('Slapping beats everything: the first one to slap the pile when a slap rule holds takes it.'),
    tx('Slap rules: Double (5, 5), Sandwich (5, 7, 5), Top bottom (the same as the pile’s first card), Tens (two cards adding up to 10, also with a J, Q or K between; an Ace counts 1), Joker, Four in a row (5, 6, 7, 8 or Q, K, A, 2, up or down), Marriage (a Queen on a King or the other way round).'),
    tx('Slapped wrong: one of your cards goes under the pile.'),
    tx('Out of cards: slap in to get back into the game. A wrong slap without cards and you’re out.'),
    tx('Whoever ends up with every card wins.'),
  ],
  online: RatScrew,
};

export default ratScrew;
