import type { ReactNode } from 'react';
import Tap from '../../components/Tap';
import { SUIT_NAME, SUIT_SYMBOL, SUITS } from '../../lib/cards';
import type { Guess, Outcome, QuestionId } from './logic';

/** The big answer buttons for each Bus Driver question (used in part 1 and the bus ride). */
export default function Answers({ questionId, onAnswer }: { questionId: QuestionId; onAnswer: (g: Guess) => void }) {
  const btn = (key: string, symbol: ReactNode, label: string, tone: string, guess: Guess) => (
    <Tap key={key} className={`answer-btn ${tone}`} onClick={() => onAnswer(guess)}>
      <span className="answer-symbol">{symbol}</span>
      <span className="answer-label">{label}</span>
    </Tap>
  );

  switch (questionId) {
    case 'color':
      return (
        <div className="answer-grid">
          {btn('red', '♥♦', 'Red', 'tone-red', { q: 'color', color: 'red' })}
          {btn('black', '♠♣', 'Black', 'tone-black', { q: 'color', color: 'black' })}
        </div>
      );
    case 'higher-lower':
      return (
        <div className="answer-grid">
          {btn('higher', '⬆', 'Higher', 'tone-mint', { q: 'higher-lower', dir: 'higher' })}
          {btn('lower', '⬇', 'Lower', 'tone-ocean', { q: 'higher-lower', dir: 'lower' })}
        </div>
      );
    case 'inside-outside':
      return (
        <div className="answer-grid">
          {btn('inside', '→ ←', 'Inside', 'tone-violet', { q: 'inside-outside', where: 'inside' })}
          {btn('outside', '← →', 'Outside', 'tone-berry', { q: 'inside-outside', where: 'outside' })}
        </div>
      );
    case 'have-it':
      return (
        <div className="answer-grid">
          {btn('yes', '👍', 'Yes, got it', 'tone-mint', { q: 'have-it', has: true })}
          {btn('no', '👎', 'Nope', 'tone-black', { q: 'have-it', has: false })}
        </div>
      );
    default:
      return (
        <div className="answer-grid">
          {SUITS.map((suit) =>
            btn(suit, SUIT_SYMBOL[suit], SUIT_NAME[suit], suit === 'hearts' || suit === 'diamonds' ? 'tone-suit-red' : 'tone-suit-black', {
              q: 'suit',
              suit,
            }),
          )}
        </div>
      );
  }
}


/** Coloured result box: green when right, red when wrong, orange for "same value". */
export function Verdict({ tone, emoji, title, sub, detail }: { tone: Outcome; emoji: string; title: string; sub: string; detail?: string }) {
  return (
    <div className={`bd-result ${tone}`}>
      <span className="bd-result-emoji">{emoji}</span>
      <span className="bd-result-text">
        <span className="bd-result-title">{title}</span>
        <span className="bd-result-sub">{sub}</span>
        {detail && <span className="bd-result-card">{detail}</span>}
      </span>
    </div>
  );
}
