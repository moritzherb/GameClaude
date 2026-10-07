import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';
import { judge, type Guess, type Result } from './logic';

/**
 * Part 3: the bus ride. The driver answers the part 1 questions in a row on fresh cards.
 * A wrong answer costs as many sips as the question number (same value: double) and
 * sends them back to question 1. The ride ends when every question is right in one go.
 */
export interface RideState {
  deck: Card[];
  /** Cards of the current run, one per correctly answered question. */
  streak: Card[];
  /** Current attempt, starting at 1. */
  attempt: number;
  drunk: number;
  /** Cards flipped so far. */
  drawn: number;
  done: boolean;
}

export function startRide(deck: Card[] = shuffle(newDeck())): RideState {
  return { deck, streak: [], attempt: 1, drunk: 0, drawn: 0, done: false };
}

export interface RideStep {
  state: RideState;
  card: Card;
  result: Result;
  /** Cards to show on the table for this answer: the run so far plus the new card. */
  shown: Card[];
  /** True if the deck ran out and a new one was shuffled for this card. */
  reshuffled: boolean;
}

export function answerRide(
  s: RideState,
  guess: Guess,
  questionCount: number,
  freshDeck: () => Card[] = () => shuffle(newDeck()),
): RideStep {
  const reshuffled = s.deck.length === 0;
  // A new deck skips the cards lying in the current run.
  const deck = reshuffled ? freshDeck().filter((c) => !s.streak.some((x) => x.value === c.value && x.suit === c.suit)) : s.deck;
  const [card, ...rest] = deck;
  const result = judge(s.streak.length, s.streak, guess, card);
  const shown = [...s.streak, card];
  const base = { ...s, deck: rest, drawn: s.drawn + 1 };

  if (result.outcome !== 'correct') {
    return { state: { ...base, streak: [], attempt: s.attempt + 1, drunk: s.drunk + result.sips }, card, result, shown, reshuffled };
  }
  return { state: { ...base, streak: shown, done: shown.length >= questionCount }, card, result, shown, reshuffled };
}
