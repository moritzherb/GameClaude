import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { t } from '../i18n';
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

/**
 * A playing card that flips (with a 3D turn) when `faceUp` changes.
 *
 * At rest a card is flat (just the side that shows): a screen full of 3D cards is a lot of separate
 * layers for the phone to keep and put together on every frame. Only while it turns is it 3D.
 */
function PlayingCard({ card, faceUp = true, size = 'md', waiting, style }: Props) {
  const up = faceUp && !!card;
  // The side drawn right now, and where the turn is: at rest (flat), getting ready (3D on the old
  // side, nothing moving yet) or turning over.
  const [shown, setShown] = useState(up);
  const [phase, setPhase] = useState<'rest' | 'ready' | 'turn'>('rest');
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (up === shown) return;
    if (phase !== 'ready') return setPhase('ready');
    // The browser has to take in the 3D card on its old side before…
    inner.current?.getBoundingClientRect();
    // …it turns over.
    setShown(up);
    setPhase('turn');
  }, [up, shown, phase]);
  useEffect(() => {
    if (phase !== 'turn') return;
    const id = window.setTimeout(() => setPhase('rest'), 650);
    return () => window.clearTimeout(id);
  }, [phase, shown]);

  return (
    <div
      className={`pcard pcard-${size}${shown ? ' up' : ''}${phase === 'rest' ? '' : ' turning'}${phase === 'ready' ? ' ready' : ''}${waiting ? ' waiting' : ''}`}
      style={style}
      role="img"
      aria-label={up && card ? cardLabel(card) : t('Face-down card')}
    >
      <div className="pcard-inner" ref={inner}>
        <CardFace card={card} />
        <div className="pcard-face pcard-back" />
      </div>
    </div>
  );
}

const sameCard = (a?: Card | null, b?: Card | null) => a === b || (!!a && !!b && a.value === b.value && a.suit === b.suit);

/** Drawn again only when something about the card changes (a table can hold dozens of them). */
export default memo(
  PlayingCard,
  (a, b) =>
    sameCard(a.card, b.card) &&
    a.faceUp === b.faceUp &&
    a.size === b.size &&
    a.waiting === b.waiting &&
    JSON.stringify(a.style) === JSON.stringify(b.style),
);

/** Screen-reader name of a card, e.g. "7 of hearts". */
function cardLabel(card: Card) {
  const rank = rankLabel(card.value);
  switch (card.suit) {
    case 'hearts':
      return t('{rank} of hearts', { rank });
    case 'diamonds':
      return t('{rank} of diamonds', { rank });
    case 'spades':
      return t('{rank} of spades', { rank });
    case 'clubs':
      return t('{rank} of clubs', { rank });
  }
}

/** The printed side of a card. Sized by the --cw of whatever it sits in. */
export const CardFace = memo(function CardFace({ card }: { card?: Card | null }) {
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
}, (a, b) => sameCard(a.card, b.card));
