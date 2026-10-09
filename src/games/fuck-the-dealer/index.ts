import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import FuckTheDealer from './FuckTheDealer';

const fuckTheDealer: GameDefinition = {
  id: 'fuck-the-dealer',
  name: tx('F*ck the Dealer'),
  emoji: '🤬',
  tagline: tx('Guess the card. Every hit goes on the dealer’s tab.'),
  color: 'var(--c-pink)',
  categories: ['cards', 'party', 'pregame'],
  minPlayers: 2,
  intensity: 3,
  explains: true,
  needs: [tx('A second phone as the deck')],
  phones: tx('2 phones'),
  rules: [
    tx('Two phones in a room: the host’s phone lies in the middle as the table, the second one is the deck and always goes to the dealer.'),
    tx('Pick a dealer. They hold the deck and peek at the top card.'),
    tx('The player on the dealer’s left guesses its value, 2 to Ace. The suit doesn’t matter.'),
    tx('Right on the first guess: the dealer gets 6 sips.'),
    tx('Wrong: the dealer says if the card is higher or lower, and the player guesses once more. Right now: the dealer gets 3 sips. Wrong again: nobody drinks.'),
    tx('Either way the card goes face up into the middle, piled by value from 2 to Ace. Once all four of a value are out, that pile is turned over.'),
    tx('Then the next player to the left guesses the next card.'),
    tx('The dealer doesn’t drink right away: the sips add up. After 3 players in a row miss, the dealer drinks them all and passes the deck to their left. The new dealer goes on with the player after the last one who guessed.'),
    tx('When the deck is empty, the last dealer drinks their sips. Game over.'),
  ],
  online: FuckTheDealer,
};

export default fuckTheDealer;
