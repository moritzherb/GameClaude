import type { ReactNode } from 'react';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { SUIT_SYMBOL, SUITS, type Suit } from '../../lib/cards';
import type { Guess, Outcome, QuestionId } from './logic';

const SUIT_LABEL: Record<Suit, string> = { hearts: tx('Hearts'), diamonds: tx('Diamonds'), spades: tx('Spades'), clubs: tx('Clubs') };

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
          {btn('red', '♥♦', t('Red'), 'tone-red', { q: 'color', color: 'red' })}
          {btn('black', '♠♣', t('Black'), 'tone-black', { q: 'color', color: 'black' })}
        </div>
      );
    case 'higher-lower':
      return (
        <div className="answer-grid">
          {btn('higher', '⬆', t('Higher'), 'tone-mint', { q: 'higher-lower', dir: 'higher' })}
          {btn('lower', '⬇', t('Lower'), 'tone-ocean', { q: 'higher-lower', dir: 'lower' })}
        </div>
      );
    case 'inside-outside':
      return (
        <div className="answer-grid">
          {btn('inside', '→ ←', t('Inside'), 'tone-violet', { q: 'inside-outside', where: 'inside' })}
          {btn('outside', '← →', t('Outside'), 'tone-berry', { q: 'inside-outside', where: 'outside' })}
        </div>
      );
    case 'have-it':
      return (
        <div className="answer-grid">
          {btn('yes', '👍', t('Yes, got it'), 'tone-mint', { q: 'have-it', has: true })}
          {btn('no', '👎', t('Nope'), 'tone-black', { q: 'have-it', has: false })}
        </div>
      );
    default:
      return (
        <div className="answer-grid four">
          {SUITS.map((suit) =>
            btn(suit, SUIT_SYMBOL[suit], t(SUIT_LABEL[suit]), suit === 'hearts' || suit === 'diamonds' ? 'tone-suit-red' : 'tone-suit-black', {
              q: 'suit',
              suit,
            }),
          )}
        </div>
      );
  }
}


/**
 * Right or wrong: a big stamp pops up over the table once the card has turned, with the sips to
 * drink or give out (or what happens now), and goes again.
 */
export function Verdict({ tone, emoji, title, sub }: { tone: Outcome; emoji: string; title: string; sub: string }) {
  return (
    <div className={`bd-pop ${tone}`} role="status">
      <span className="bd-pop-emoji">{emoji}</span>
      <span className="bd-pop-title">{title}</span>
      <span className="bd-pop-sub">{sub}</span>
    </div>
  );
}
