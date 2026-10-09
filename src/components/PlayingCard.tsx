import type { CSSProperties } from 'react';
import { cardColor, rankLabel, type Card } from '../lib/cards';
import Suit from './Suit';

interface Props {
  /** Leave empty for a face-down card with nothing behind it yet. */
  card?: Card | null;
  faceUp?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
        <CardFace card={card} />
        <div className="pcard-face pcard-back" />
      </div>
    </div>
  );
}

/** The printed side of a card. Sized by the --cw of whatever it sits in. */
export function CardFace({ card }: { card?: Card | null }) {
  return (
    <div className={`pcard-face pcard-front ${card ? cardColor(card) : ''}`}>
      {card && (
        <>
          <span className="pcard-corner">
            {rankLabel(card.value)}
            <Suit suit={card.suit} />
          </span>
          <Suit suit={card.suit} className="pcard-center" />
          <span className="pcard-corner bottom">
            {rankLabel(card.value)}
            <Suit suit={card.suit} />
          </span>
        </>
      )}
    </div>
  );
}
