import { cardColor, type Card, type Suit } from '../../lib/cards';

export type QuestionId = 'color' | 'higher-lower' | 'inside-outside' | 'have-it' | 'suit';

export type Guess =
  | { q: 'color'; color: 'red' | 'black' }
  | { q: 'higher-lower'; dir: 'higher' | 'lower' }
  | { q: 'inside-outside'; where: 'inside' | 'outside' }
  | { q: 'have-it'; has: boolean }
  | { q: 'suit'; suit: Suit };

export interface Question {
  id: QuestionId;
  title: string;
  /** Shown on the round intro screen. */
  explain: string;
}

/** The questions in order. Round N is worth N sips. "suit" only plays in risky mode. */
export const QUESTIONS: Question[] = [
  { id: 'color', title: 'Red or black?', explain: 'Guess the colour of your first card.' },
  { id: 'higher-lower', title: 'Higher or lower?', explain: 'Will the next card be higher or lower than your first card? Same value means double sips!' },
  {
    id: 'inside-outside',
    title: 'Inside or outside?',
    explain: 'Will the next card land between your two cards or outside of them? Hitting one of their values exactly means double sips!',
  },
  { id: 'have-it', title: 'Got it already?', explain: 'Will the next card have a suit you already hold?' },
  { id: 'suit', title: 'Which suit?', explain: 'Risky! Guess the exact suit of the next card. One in four chance.' },
];

export function questionsFor(risky: boolean) {
  return risky ? QUESTIONS : QUESTIONS.slice(0, 4);
}

export type Outcome = 'correct' | 'wrong' | 'same';

export interface Result {
  outcome: Outcome;
  /** Correct → you give these sips out. Wrong / same → you drink them. */
  sips: number;
}

/**
 * Judges one answer. `round` is 0-based, `hand` holds the cards the player already has
 * (exactly `round` cards), `card` is the card that was just drawn.
 */
export function judge(round: number, hand: Card[], guess: Guess, card: Card): Result {
  const sips = round + 1;
  const ok = (correct: boolean): Result => ({ outcome: correct ? 'correct' : 'wrong', sips });
  const same: Result = { outcome: 'same', sips: sips * 2 };

  switch (guess.q) {
    case 'color':
      return ok(cardColor(card) === guess.color);
    case 'higher-lower': {
      const first = hand[0].value;
      if (card.value === first) return same;
      return ok(guess.dir === 'higher' ? card.value > first : card.value < first);
    }
    case 'inside-outside': {
      const lo = Math.min(hand[0].value, hand[1].value);
      const hi = Math.max(hand[0].value, hand[1].value);
      if (card.value === lo || card.value === hi) return same;
      const inside = card.value > lo && card.value < hi;
      return ok(guess.where === 'inside' ? inside : !inside);
    }
    case 'have-it':
      return ok(hand.some((c) => c.suit === card.suit) === guess.has);
    case 'suit':
      return ok(card.suit === guess.suit);
  }
}
