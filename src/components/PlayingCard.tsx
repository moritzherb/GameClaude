import type { CSSProperties } from 'react';
import { cardColor, rankLabel, SUIT_SYMBOL, type Card } from '../lib/cards';

interface Props {
  /** Leave empty for a face-down card with nothing behind it yet. */
  card?: Card | null;
  faceUp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Pulsing glow for the card that's about to be revealed. */
  waiting?: boolean;
  style?: CSSProperties;
}

/** A playing card that flips (with a 3D turn) when `faceUp` changes. */
export default function PlayingCard({ card, faceUp = true, size = 'md', waiting, style }: Props) {
  const up = faceUp && !!card;
  return (
    <div
      className={`pcard pcard-${size}${up ? ' up' : ''}${waiting ? ' waiting' : ''}`}
      style={style}
      role="img"
      aria-label={up && card ? `${rankLabel(card.value)} of ${card.suit}` : 'Face-down card'}
    >
      <div className="pcard-inner">
        <div className={`pcard-face pcard-front ${card ? cardColor(card) : ''}`}>
          {card && (
            <>
              <span className="pcard-corner">
                {rankLabel(card.value)}
                <span>{SUIT_SYMBOL[card.suit]}</span>
              </span>
              <span className="pcard-center">{SUIT_SYMBOL[card.suit]}</span>
              <span className="pcard-corner bottom">
                {rankLabel(card.value)}
                <span>{SUIT_SYMBOL[card.suit]}</span>
              </span>
            </>
          )}
        </div>
        <div className="pcard-face pcard-back" />
      </div>
    </div>
  );
}
