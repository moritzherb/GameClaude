import { useId } from 'react';
import type { Pose } from './logic';

/*
 * The two little rubber pigs, seen from above the table, like the ones in the box: plump,
 * glossy pink, short snout, ears folded forward, stubby trotters, a curly tail, and a black
 * dot on one side. Lying on a side shows the profile (with or without the dot); on the back
 * shows the belly with the trotters up; standing shows the back; on the snout and on snout
 * and ear show the profile tipped over.
 */

interface Paint {
  body: string;
  shade: string;
  limb: string;
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      {/* Rubber: a bright highlight top left, deeper pink towards the edges. */}
      <radialGradient id={`${id}b`} cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ffe1e8" />
        <stop offset="0.35" stopColor="#f9aec0" />
        <stop offset="0.8" stopColor="#ec8aa4" />
        <stop offset="1" stopColor="#d46a88" />
      </radialGradient>
      <radialGradient id={`${id}l`} cx="0.4" cy="0.3" r="0.9">
        <stop offset="0" stopColor="#f9b5c6" />
        <stop offset="1" stopColor="#cf6684" />
      </radialGradient>
      <radialGradient id={`${id}s`} cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffc7d4" />
        <stop offset="1" stopColor="#e07894" />
      </radialGradient>
    </defs>
  );
}

/** Lying on a side: the profile, facing right. */
function Profile({ dot, p, s }: { dot: boolean; p: Paint; s: string }) {
  return (
    <>
      {/* Curly tail */}
      <path d="M21 39c-7-2-8-10-2-11 5-1 5 6 0 7" fill="none" stroke="#d9738f" strokeWidth="2.8" strokeLinecap="round" />
      {/* Far legs, a bit darker */}
      <ellipse cx="38" cy="60" rx="6" ry="9" fill={p.shade} />
      <ellipse cx="72" cy="61" rx="6" ry="9" fill={p.shade} />
      {/* Plump body and head in one */}
      <path d="M24 42c0-15 15-24 36-24 18 0 30 6 37 14 4 5 6 9 6 13 0 10-12 18-31 19H48c-15 0-24-9-24-22z" fill={p.body} />
      {/* Near legs */}
      <ellipse cx="45" cy="64" rx="6.5" ry="9" fill={p.limb} />
      <ellipse cx="79" cy="64" rx="6.5" ry="9" fill={p.limb} />
      <ellipse cx="45" cy="71" rx="5" ry="2.4" fill="#b85676" />
      <ellipse cx="79" cy="71" rx="5" ry="2.4" fill="#b85676" />
      {/* Snout: a short flat disc */}
      <ellipse cx="104" cy="44" rx="6" ry="9.5" fill={s} />
      <ellipse cx="106.5" cy="44" rx="3.2" ry="7" fill="#f7b3c3" />
      <ellipse cx="106" cy="40.5" rx="1.2" ry="2" fill="#9b3e58" />
      <ellipse cx="106" cy="47.5" rx="1.2" ry="2" fill="#9b3e58" />
      {/* Ear folded forward */}
      <path d="M82 23c4-8 12-11 16-8-1 7-6 12-13 14z" fill={p.limb} />
      <path d="M85 23c3-5 8-7 11-6-1 4-4 8-9 9z" fill="#f7b8c8" />
      {/* Eye */}
      <circle cx="93" cy="34" r="2.3" fill="#2a1a1e" />
      <circle cx="93.7" cy="33.3" r="0.7" fill="#fff" />
      {dot && (
        <>
          <circle cx="56" cy="44" r="6.5" fill="#15130f" />
          <circle cx="54" cy="42" r="1.6" fill="#fff" opacity="0.35" />
        </>
      )}
      {/* Gloss */}
      <path d="M36 28c9-6 24-8 36-5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** Standing on its trotters: the back from above, head to the right. */
function Back({ p, s }: { p: Paint; s: string }) {
  return (
    <>
      <path d="M17 40c-7-3-6-11 0-10 5 1 3 7-2 6" fill="none" stroke="#d9738f" strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="34" cy="21" rx="6" ry="4" fill={p.shade} />
      <ellipse cx="34" cy="59" rx="6" ry="4" fill={p.shade} />
      <ellipse cx="74" cy="20" rx="6" ry="4" fill={p.shade} />
      <ellipse cx="74" cy="60" rx="6" ry="4" fill={p.shade} />
      <path d="M22 40c0-13 15-21 36-21 20 0 34 7 40 15 2 3 2 9 0 12-6 8-20 15-40 15-21 0-36-8-36-21z" fill={p.body} />
      <ellipse cx="104" cy="40" rx="5" ry="8.5" fill={s} />
      <path d="M86 28c3-8 10-11 14-8-2 6-7 10-13 11z" fill={p.limb} />
      <path d="M86 52c3 8 10 11 14 8-2-6-7-10-13-11z" fill={p.limb} />
      <path d="M32 33c12-8 34-9 50-2" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** On its back: belly up, trotters in the air. */
function Belly({ p, s }: { p: Paint; s: string }) {
  return (
    <>
      <path d="M22 40c0-13 15-21 36-21 20 0 34 7 40 15 2 3 2 9 0 12-6 8-20 15-40 15-21 0-36-8-36-21z" fill={p.body} />
      <ellipse cx="58" cy="40" rx="27" ry="13" fill="#fdd6df" opacity="0.8" />
      {[44, 56, 68].map((x) => (
        <g key={x}>
          <circle cx={x} cy="35" r="1.4" fill="#d9738f" />
          <circle cx={x} cy="45" r="1.4" fill="#d9738f" />
        </g>
      ))}
      {/* Trotters up, seen from above: four round stubs with dark tips. */}
      {[
        [38, 24],
        [76, 23],
        [38, 56],
        [76, 57],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="7" fill={p.limb} />
          <circle cx={x} cy={y} r="3.6" fill="#b85676" />
        </g>
      ))}
      <ellipse cx="104" cy="40" rx="5" ry="8.5" fill={s} />
      <path d="M17 40c-6-2-6-9 0-9 4 0 3 6-2 5" fill="none" stroke="#d9738f" strokeWidth="2.8" strokeLinecap="round" />
    </>
  );
}

export default function Pig({ pose, className = '' }: { pose: Pose; className?: string }) {
  const id = `pig${useId().replace(/:/g, '')}`;
  const p: Paint = { body: `url(#${id}b)`, shade: '#cf6684', limb: `url(#${id}l)` };
  const s = `url(#${id}s)`;
  // On the snout, or on snout and ear: the profile tipped over onto its nose.
  const tip = pose === 'snout' ? 'rotate(62 60 42)' : pose === 'jowl' ? 'rotate(124 60 42)' : undefined;
  return (
    <svg className={`sw-pig ${className}`} viewBox="0 0 120 84" aria-hidden>
      <Defs id={id} />
      <g transform={tip}>
        {pose === 'back' ? (
          <Belly p={p} s={s} />
        ) : pose === 'standing' ? (
          <Back p={p} s={s} />
        ) : (
          // The side without the dot is the other side: the mirrored profile.
          <g transform={pose === 'side' ? 'translate(120 0) scale(-1 1)' : undefined}>
            <Profile dot={pose !== 'side'} p={p} s={s} />
          </g>
        )}
      </g>
    </svg>
  );
}
