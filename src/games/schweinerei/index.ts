import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Schweinerei from './Schweinerei';

const schweinerei: GameDefinition = {
  id: 'schweinerei',
  name: tx('Schweinerei'),
  emoji: '🐷',
  tagline: tx('Two little pigs. Know when to stop.'),
  color: 'var(--c-pink)',
  categories: ['dice', 'party', 'quick'],
  minPlayers: 2,
  intensity: 2,
  explains: true,
  rules: [
    tx('Throw the two little pigs. How they land scores. Keep throwing to add up your turn, or put the points in the pen and hand on.'),
    tx('Both on the same side: 1 point. On different sides (one with the dot up, one without): pig out! This turn’s points are gone and you drink 1.'),
    tx('One pig on its side counts the other one: on its back 5, standing 5, on its snout 10, on snout and ear 15. Two different ones add up.'),
    tx('Both the same is a double: back or standing 20, snout 40, snout and ear 60. A double lets you give out sips (2, 4 or 6).'),
    tx('The pigs touch: all your points are gone, drink 2. One lands on top of the other: all your points are gone, drink up.'),
    tx('First to 100 wins. Everyone else drinks a sip for every 10 points they’re short.'),
  ],
  component: Schweinerei,
};

export default schweinerei;
