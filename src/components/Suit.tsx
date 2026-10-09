import type { Suit as SuitName } from '../lib/cards';

/** Card suits drawn as shapes, so they look the same on every phone (no emoji fallback). */
export default function Suit({ suit, className }: { suit: SuitName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden>
      {suit === 'hearts' && (
        <path d="M12 21.4 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5z" />
      )}
      {suit === 'diamonds' && <path d="M12 1.5 20 12l-8 10.5L4 12z" />}
      {suit === 'spades' && (
        <path d="M12 1.5C9.2 5.4 3 9 3 13.8a4.6 4.6 0 0 0 7.7 3.4c-.3 2-1.2 3.6-2.9 5.3h8.4c-1.7-1.7-2.6-3.3-2.9-5.3A4.6 4.6 0 0 0 21 13.8C21 9 14.8 5.4 12 1.5z" />
      )}
      {suit === 'clubs' && (
        <>
          <circle cx="12" cy="6.6" r="4.6" />
          <circle cx="6.6" cy="13.4" r="4.6" />
          <circle cx="17.4" cy="13.4" r="4.6" />
          {/* fills the gap where the three leaves meet */}
          <circle cx="12" cy="11.6" r="3.4" />
          <path d="M10.6 12.5h2.8c.3 4.1 1.3 7 3.4 10H7.2c2.1-3 3.1-5.9 3.4-10z" />
        </>
      )}
    </svg>
  );
}
