import { t } from '../i18n';

/** How many cards are left in the deck: a tiny card stack and the number. */
export default function DeckCount({ left }: { left: number }) {
  return (
    <span className="deck-count" aria-label={left === 1 ? t('{n} card left in the deck', { n: left }) : t('{n} cards left in the deck', { n: left })}>
      <span className="deck-count-stack" aria-hidden>
        <i />
        <i />
      </span>
      <span className="deck-count-num">{left}</span>
      <span className="deck-count-label">{t('left')}</span>
    </span>
  );
}
