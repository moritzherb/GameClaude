import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Fantasy from './Fantasy';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';

const spellbound: GameDefinition = {
  id: 'spellbound',
  name: tx('Spellbound'),
  emoji: '🧙',
  tagline: tx('Say how many tricks you’ll take. Then take exactly that many.'),
  color: 'var(--c-indigo)',
  categories: ['cards'],
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  intensity: 1,
  explains: true,
  table: 'full',
  needs: [tx('Every player’s phone')],
  rules: [
    tx('Everyone joins the same room on their own phone. 60 cards: Fire, Water, Nature and Astral 1 to 13, four Archmages, four Fools.'),
    tx('Round 1: one card each, round 2: two, and so on (3 players play 20 rounds, 4 play 15, 5 play 12, 6 play 10; a quick match 5).'),
    tx('A card is turned up for trump: a number makes its faction trump, a Fool means no trump, an Archmage lets the dealer pick.'),
    tx('From left of the dealer, everyone says how many tricks they’ll take (0 up to the round’s cards). It can’t be changed.'),
    tx('Follow the faction of the first number card played if you can; an Archmage or a Fool may always be played.'),
    tx('The first Archmage takes the trick; else the highest trump; else the highest card of the faction led. Fools lose, unless all are Fools: then the first one.'),
    tx('Whoever wins a trick takes it (“Take the trick”): it lies beside them, and they lead the next.'),
    tx('Exactly right: 20 points plus 10 per trick. Off: minus 10 per trick off.'),
    tx('Most points after the last round wins.'),
  ],
  online: Fantasy,
};

export default spellbound;
