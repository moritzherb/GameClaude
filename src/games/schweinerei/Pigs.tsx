import { useId } from 'react';
import type { Pose } from './logic';

/*
 * The two little rubber pigs, seen from above the table, like the ones in the box: soft matte
 * pink rubber, big ears pricked forward, a pink snout disc, pink trotters, a curly tail, black
 * button eyes, and a black dot on one side. Lying on a side shows the profile (with or
 * without the dot); on the back shows the belly with the trotters up; standing shows the
 * back; on the snout and on snout and ear show the profile tipped over.
 */

const EDGE = '#c97f7a';
const TROTTER = '#e0718d';
const INNER = '#ef93a6';

function Defs({ id }: { id: string }) {
  return (
    <defs>
      {/* Matte rubber: a soft light from the top left, warmer and darker towards the edges. */}
      <radialGradient id={`${id}b`} cx="0.4" cy="0.28" r="0.85">
        <stop offset="0" stopColor="#fdd9cf" />
        <stop offset="0.45" stopColor="#f6b9ab" />
        <stop offset="0.85" stopColor="#e99d91" />
        <stop offset="1" stopColor="#d88a82" />
      </radialGradient>
      {/* Shade under the belly. */}
      <linearGradient id={`${id}u`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stopColor="#c46f6c" stopOpacity="0" />
        <stop offset="1" stopColor="#c46f6c" stopOpacity="0.45" />
      </linearGradient>
      <radialGradient id={`${id}s`} cx="0.35" cy="0.35" r="0.8">
        <stop offset="0" stopColor="#f7a3b4" />
        <stop offset="1" stopColor="#d9617f" />
      </radialGradient>
    </defs>
  );
}

/** Lying on a side: the profile, facing right. Chunky like the toy: round body, big head. */
function Profile({ dot, id }: { dot: boolean; id: string }) {
  const body = `url(#${id}b)`;
  const shade = `url(#${id}u)`;
  return (
    <>
      {/* Curly tail */}
      <path d="M24 33c-6-4-11 0-9 4 2 4 8 2 6-2" fill="none" stroke={EDGE} strokeWidth="2.8" strokeLinecap="round" />
      {/* Far legs, in the shade */}
      <path d="M41 55c-2 6-3 11-2 15 1 3 6 3 7 0 1-4 1-9 1-14z" fill="#d9907f" />
      <path d="M72 56c0 6 1 11 3 14 2 3 7 1 6-2-1-4-2-9-3-13z" fill="#d9907f" />
      {/* Round body */}
      <path d="M22 42c0-15 14-25 34-25 19 0 32 9 34 22 2 13-10 23-32 24-22 1-36-7-36-21z" fill={body} />
      <path d="M22 42c0-15 14-25 34-25 19 0 32 9 34 22 2 13-10 23-32 24-22 1-36-7-36-21z" fill={shade} />
      {/* Near legs: short and stubby, splayed */}
      <path d="M33 55c-4 5-7 10-7 14 0 4 6 5 8 1 2-4 4-9 6-13z" fill={body} />
      <ellipse cx="29" cy="71" rx="4.6" ry="3.4" transform="rotate(25 29 71)" fill={TROTTER} />
      <path d="M78 55c-1 6 0 11 2 15 2 3 8 2 8-2 0-4-1-9-3-13z" fill={body} />
      <ellipse cx="84" cy="71" rx="4.6" ry="3.4" transform="rotate(-15 84 71)" fill={TROTTER} />
      {/* Big head with chubby cheeks */}
      <path d="M76 27c7-9 21-10 28-2 6 7 5 17-2 22-7 5-18 5-24-1-5-5-6-13-2-19z" fill={body} />
      {/* Short snout ending in a pink disc */}
      <path d="M99 30c3-1 6-1 8 0v14c-2 1-5 1-8 0z" fill={body} />
      <ellipse cx="107.5" cy="37" rx="5.2" ry="7.6" fill={`url(#${id}s)`} />
      <ellipse cx="109.4" cy="37" rx="2.8" ry="5.4" fill={INNER} />
      <ellipse cx="109.4" cy="34.8" rx="1" ry="1.6" fill="#8c2f4a" />
      <ellipse cx="109.4" cy="39.2" rx="1" ry="1.6" fill="#8c2f4a" />
      {/* Smile */}
      <path d="M96 46q4 3 8-1" fill="none" stroke={EDGE} strokeWidth="1.4" strokeLinecap="round" />
      {/* Big floppy ear, pointing forward */}
      <path d="M83 25c2-10 10-17 20-17-1 10-7 17-16 20z" fill={body} />
      <path d="M86 24c2-7 7-12 14-13-1 7-5 12-11 14z" fill={INNER} />
      {/* Button eye */}
      <circle cx="94" cy="31.5" r="2.3" fill="#1a1414" />
      <circle cx="94.7" cy="30.8" r="0.7" fill="#fff" opacity="0.7" />
      {dot && <ellipse cx="54" cy="39" rx="5.6" ry="5" fill="#191414" />}
      {/* A faint sheen on the rubber */}
      <path d="M40 23c9-4 20-4 29-1" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** Standing on its trotters: the round back from above, head to the right, ears flopped forward. */
function Back({ id }: { id: string }) {
  const body = `url(#${id}b)`;
  return (
    <>
      <path d="M21 40c-6-4-10 0-8 4 2 4 7 2 5-2" fill="none" stroke={EDGE} strokeWidth="2.8" strokeLinecap="round" />
      {/* Trotters peeking out under the belly */}
      <ellipse cx="36" cy="19" rx="5" ry="4" fill={TROTTER} />
      <ellipse cx="36" cy="61" rx="5" ry="4" fill={TROTTER} />
      <ellipse cx="68" cy="18" rx="5" ry="4" fill={TROTTER} />
      <ellipse cx="68" cy="62" rx="5" ry="4" fill={TROTTER} />
      <ellipse cx="51" cy="40" rx="31" ry="22" fill={body} />
      <ellipse cx="88" cy="40" rx="15" ry="16" fill={body} />
      <path d="M100 34c3-1 6-1 7 0v12c-1 1-4 1-7 0z" fill={body} />
      <ellipse cx="107" cy="40" rx="4" ry="6.5" fill={`url(#${id}s)`} />
      {/* Big ears flopped forward over the head */}
      <path d="M84 30c4-9 12-12 19-10-2 7-8 12-16 13z" fill={body} />
      <path d="M87 29c3-6 8-8 13-7-2 5-6 8-11 9z" fill={INNER} />
      <path d="M84 50c4 9 12 12 19 10-2-7-8-12-16-13z" fill={body} />
      <path d="M87 51c3 6 8 8 13 7-2-5-6-8-11-9z" fill={INNER} />
      <path d="M30 32c10-7 26-8 38-3" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** On its back: belly up, the four stubby legs in the air. */
function Belly({ id }: { id: string }) {
  const body = `url(#${id}b)`;
  return (
    <>
      {[
        [36, 17, -1],
        [68, 16, -1],
        [36, 63, 1],
        [68, 64, 1],
      ].map(([x, y, d]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y} rx="7" ry="8" fill={body} />
          <ellipse cx={x} cy={y + d * 3.5} rx="4.6" ry="3.6" fill={TROTTER} />
        </g>
      ))}
      <ellipse cx="51" cy="40" rx="31" ry="22" fill={body} />
      <ellipse cx="51" cy="40" rx="22" ry="13" fill="#fbd0c6" opacity="0.85" />
      {[40, 51, 62].map((x) => (
        <g key={x}>
          <circle cx={x} cy="35" r="1.3" fill={TROTTER} />
          <circle cx={x} cy="45" r="1.3" fill={TROTTER} />
        </g>
      ))}
      <ellipse cx="88" cy="40" rx="15" ry="16" fill={body} />
      <path d="M100 34c3-1 6-1 7 0v12c-1 1-4 1-7 0z" fill={body} />
      <ellipse cx="107" cy="40" rx="4" ry="6.5" fill={`url(#${id}s)`} />
      {/* Ears lying flat out to the sides */}
      <path d="M84 27c-2-8 2-15 9-17 3 6 1 13-4 18z" fill={body} />
      <path d="M84 53c-2 8 2 15 9 17 3-6 1-13-4-18z" fill={body} />
      <circle cx="93" cy="34" r="1.8" fill="#1a1414" />
      <circle cx="93" cy="46" r="1.8" fill="#1a1414" />
      <path d="M19 40c-6-3-9 1-7 4 2 3 6 1 4-2" fill="none" stroke={EDGE} strokeWidth="2.8" strokeLinecap="round" />
    </>
  );
}

export default function Pig({ pose, className = '' }: { pose: Pose; className?: string }) {
  const id = `pig${useId().replace(/:/g, '')}`;
  // On the snout, or on snout and ear: the profile tipped over onto its nose.
  const tip = pose === 'snout' ? 'rotate(62 60 42)' : pose === 'jowl' ? 'rotate(124 60 42)' : undefined;
  return (
    <svg className={`sw-pig ${className}`} viewBox="0 0 120 84" aria-hidden>
      <Defs id={id} />
      <g transform={tip}>
        {pose === 'back' ? (
          <Belly id={id} />
        ) : pose === 'standing' ? (
          <Back id={id} />
        ) : (
          // The side without the dot is the other side: the mirrored profile.
          <g transform={pose === 'side' ? 'translate(120 0) scale(-1 1)' : undefined}>
            <Profile dot={pose !== 'side'} id={id} />
          </g>
        )}
      </g>
    </svg>
  );
}
