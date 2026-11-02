import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Party from './Party';

const party: GameDefinition = {
  id: 'party',
  name: tx('Party'),
  emoji: '🎉',
  tagline: tx('A board game: roll, move, do what the field says.'),
  color: 'var(--c-orange)',
  categories: ['party', 'dice'],
  minPlayers: 2,
  intensity: 3,
  needs: [tx('Shots')],
  rules: [
    tx('Pick a board and everyone picks a pawn. Then take turns: roll the die and move that many fields.'),
    tx('Do what the field you land on says. The phone explains it and plays the little games with you.'),
    tx('Only the exact number gets you into the finish. Roll too many, and you walk the rest back.'),
    tx('A bridge stops you: roll what it says to cross, or drink 1 and try again next turn. In prison, only a 6 gets you out.'),
    tx('Bridges back and the mole’s tunnel send you back. Roll back: roll again and go that many fields back.'),
    tx('An Ace up your sleeve skips a field you don’t want to do, once.'),
    tx('First into the finish wins.'),
    tx('Make your own board: start from one of the boards, put the fields you like where you like, and save it.'),
  ],
  component: Party,
};

export default party;
