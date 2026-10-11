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

/**
 * Lying on a side: the profile, facing right, in the leaping pose of the toys: bulky body,
 * head up with a big pricked ear, front legs stretched forward, back legs stretched back.
 */
function Profile({ dot, id }: { dot: boolean; id: string }) {
  const body = `url(#${id}b)`;
  const shade = `url(#${id}u)`;
  return (
    <>
      {/* Curly tail on top of the rump */}
      <path d="M22 29c-4-6-11-4-10 1 1 5 7 4 6-1" fill="none" stroke={EDGE} strokeWidth="2.6" strokeLinecap="round" />
      {/* Far legs, in the shade */}
      <path d="M42 53c-5 6-10 11-15 16-2 3 2 6 5 4 5-4 10-9 15-15z" fill="#d68f82" stroke="#d68f82" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M74 52c3 7 6 13 9 18 2 3 7 1 6-2-2-6-5-12-9-18z" fill="#d68f82" stroke="#d68f82" strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="29" cy="71" rx="5" ry="3.6" transform="rotate(-35 29 71)" fill="#cf6a84" />
      <ellipse cx="86" cy="70.5" rx="5" ry="3.6" transform="rotate(25 86 70.5)" fill="#cf6a84" />
      {/* Bulky body: round rump, deep chest */}
      <path d="M19 37c0-12 11-19 26-19 14 0 27 2 37 7 7 4 9 11 7 18-2 8-10 13-22 15-12 2-28 2-37-2-8-4-11-10-11-19z" fill={body} />
      <path d="M19 37c0-12 11-19 26-19 14 0 27 2 37 7 7 4 9 11 7 18-2 8-10 13-22 15-12 2-28 2-37-2-8-4-11-10-11-19z" fill={shade} />
      {/* Near back leg, stretched back */}
      <path d="M36 50c-6 5-13 10-19 13-3 2-1 7 3 6 7-3 15-8 22-13z" fill={body} stroke={body} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="17.5" cy="66.5" rx="5.4" ry="3.8" transform="rotate(-25 17.5 66.5)" fill={TROTTER} />
      {/* Near front leg, stretched forward */}
      <path d="M78 47c5 5 10 11 14 17 2 3 7 1 6-3-3-7-9-13-15-18z" fill={body} stroke={body} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="96" cy="66" rx="5.4" ry="3.8" transform="rotate(35 96 66)" fill={TROTTER} />
      {/* Far ear, behind the head */}
      <path d="M85 21c-3-8-1-15 4-19 3 6 3 12 1 18z" fill="#dc9a8d" />
      {/* Big head, held up */}
      <path d="M79 27c1-10 10-15 19-13 8 2 12 9 11 17-1 8-8 13-16 13-9 0-15-7-14-17z" fill={body} />
      {/* Snout: a round pink disc, pointing forward */}
      <path d="M103 24c3-1 7 0 9 2l-1 13c-3 2-6 2-9 1z" fill={body} />
      <ellipse cx="111" cy="32" rx="5" ry="7.4" transform="rotate(-8 111 32)" fill={`url(#${id}s)`} />
      <ellipse cx="112.6" cy="32" rx="2.6" ry="5.2" transform="rotate(-8 112.6 32)" fill={INNER} />
      <ellipse cx="112.4" cy="29.6" rx="0.9" ry="1.5" fill="#8c2f4a" />
      <ellipse cx="113" cy="34.2" rx="0.9" ry="1.5" fill="#8c2f4a" />
      {/* Open smile */}
      <path d="M98 39c3 4 8 4 11 0-3 5-8 6-11 0z" fill="#b8485f" />
      {/* Big ear pricked up and forward, pink inside */}
      <path d="M88 18c0-9 4-15 10-18 2 7 1 14-4 20z" fill={body} />
      <path d="M90 17c0-6 3-10 7-13 1 5 0 10-3 14z" fill={INNER} />
      {/* Button eye */}
      <circle cx="99" cy="24" r="2.1" fill="#1a1414" />
      {dot && (
        <>
          <ellipse cx="52" cy="35" rx="5.6" ry="5" fill="#191414" />
          <circle cx="40" cy="44" r="2.4" fill="#191414" />
          <circle cx="64" cy="45" r="2" fill="#191414" />
        </>
      )}
      {/* A faint sheen on the rubber */}
      <path d="M34 22c10-3 22-3 32 0" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** Standing on its trotters: the round back from above, head to the right, ears flopped forward. */
function Back({ id }: { id: string }) {
  const body = `url(#${id}b)`;
  return (
    <>
      <path d="M21 40c-6-4-10 0-8 4 2 4 7 2 5-2" fill="none" stroke={EDGE} strokeWidth="2.8" strokeLinecap="round" />
      {/* Legs stretched forward and back, peeking out under the body */}
      {[
        [30, 22, -30],
        [30, 58, 30],
        [72, 20, 30],
        [72, 60, -30],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
          <ellipse cx={x < 50 ? x - 6 : x + 6} cy={y} rx="9" ry="4.5" fill="#e8a596" />
          <ellipse cx={x < 50 ? x - 13 : x + 13} cy={y} rx="3.6" ry="3.8" fill={TROTTER} />
        </g>
      ))}
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
      {/* The four legs in the air, stretched forward and back like in the leap */}
      {[
        [30, 21, -30],
        [30, 59, 30],
        [72, 19, 30],
        [72, 61, -30],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
          <ellipse cx={x < 50 ? x - 6 : x + 6} cy={y} rx="10" ry="5.5" fill={body} />
          <ellipse cx={x < 50 ? x - 14 : x + 14} cy={y} rx="4" ry="4.4" fill={TROTTER} />
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
