/** How many cards are left in the deck: a tiny card stack and the number. */
export default function DeckCount({ left }: { left: number }) {
  return (
    <span className="deck-count" aria-label={`${left} card${left === 1 ? '' : 's'} left in the deck`}>
      <span className="deck-count-stack" aria-hidden>
        <i />
        <i />
      </span>
      <span className="deck-count-num">{left}</span>
      <span className="deck-count-label">left</span>
    </span>
  );
}
