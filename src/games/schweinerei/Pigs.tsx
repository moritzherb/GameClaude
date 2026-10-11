import type { Pose } from './logic';

/*
 * The two little pigs, seen from above the table: lying on a side (the profile, with or without
 * the black dot), on the back (belly and trotters up), standing (the back), on the snout, or on
 * snout and ear.
 */

const PINK = '#f7a8bb';
const DARK = '#e07a96';
const BELLY = '#fcd0db';

/** A pig lying on its side: the profile, facing right. */
function Profile({ dot }: { dot: boolean }) {
  return (
    <>
      <path d="M18 37c-9-5-4-15 2-10s-2 11-9 7" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
      <rect x="30" y="54" width="9" height="17" rx="4" fill={DARK} />
      <rect x="44" y="56" width="9" height="16" rx="4" fill={DARK} />
      <rect x="66" y="56" width="9" height="16" rx="4" fill={DARK} />
      <rect x="79" y="54" width="9" height="17" rx="4" fill={DARK} />
      <ellipse cx="55" cy="42" rx="38" ry="23" fill={PINK} />
      <circle cx="91" cy="37" r="17" fill={PINK} />
      <path d="M82 24l7-15 9 14z" fill={DARK} />
      <ellipse cx="107" cy="41" rx="7" ry="9" fill={DARK} />
      <ellipse cx="106" cy="38" rx="1.6" ry="2.4" fill="#9b3e58" />
      <ellipse cx="106" cy="44" rx="1.6" ry="2.4" fill="#9b3e58" />
      <circle cx="96" cy="32" r="2.4" fill="#2a1a1e" />
      <path d="M38 30q12-8 30-6" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
      {dot && <circle cx="52" cy="44" r="6" fill="#1d1b17" />}
    </>
  );
}

/** Standing on its trotters: the back from above, head to the right. */
function Back() {
  return (
    <>
      <path d="M16 40c-9-4-6-14 1-10s-1 11-8 8" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="52" cy="40" rx="37" ry="21" fill={PINK} />
      <path d="M22 40h56" stroke={DARK} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <circle cx="90" cy="40" r="15" fill={PINK} />
      <path d="M84 27l-8-12 13 4z" fill={DARK} />
      <path d="M84 53l-8 12 13-4z" fill={DARK} />
      <ellipse cx="104" cy="40" rx="5" ry="8" fill={DARK} />
      <path d="M40 26q14-6 28 0" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/** On its back: belly and four trotters in the air. */
function Belly() {
  return (
    <>
      <rect x="26" y="8" width="10" height="20" rx="4" fill={DARK} transform="rotate(-20 31 18)" />
      <rect x="70" y="8" width="10" height="20" rx="4" fill={DARK} transform="rotate(18 75 18)" />
      <rect x="26" y="52" width="10" height="20" rx="4" fill={DARK} transform="rotate(20 31 62)" />
      <rect x="70" y="52" width="10" height="20" rx="4" fill={DARK} transform="rotate(-18 75 62)" />
      <circle cx="30" cy="10" r="4.5" fill="#6b3a46" />
      <circle cx="77" cy="10" r="4.5" fill="#6b3a46" />
      <circle cx="30" cy="70" r="4.5" fill="#6b3a46" />
      <circle cx="77" cy="70" r="4.5" fill="#6b3a46" />
      <ellipse cx="54" cy="40" rx="37" ry="22" fill={PINK} />
      <ellipse cx="54" cy="40" rx="27" ry="14" fill={BELLY} />
      {[36, 48, 60, 72].map((x) => (
        <circle key={x} cx={x} cy="35" r="1.6" fill={DARK} />
      ))}
      {[36, 48, 60, 72].map((x) => (
        <circle key={x} cx={x} cy="45" r="1.6" fill={DARK} />
      ))}
      <circle cx="92" cy="40" r="15" fill={PINK} />
      <ellipse cx="106" cy="40" rx="6" ry="8" fill={DARK} />
      <path d="M86 52l-4 12 10-6z" fill={DARK} />
    </>
  );
}

export default function Pig({ pose, className = '' }: { pose: Pose; className?: string }) {
  // Snout and snout-and-ear: the profile tipped onto its nose.
  const tip = pose === 'snout' ? 'rotate(62 60 40)' : pose === 'jowl' ? 'rotate(128 60 40)' : undefined;
  return (
    <svg className={`sw-pig ${className}`} viewBox="0 0 120 80" aria-hidden>
      <g transform={tip}>
        {pose === 'back' ? (
          <Belly />
        ) : pose === 'standing' ? (
          <Back />
        ) : (
          // The side without the dot is the other side: the mirrored profile.
          <g transform={pose === 'side' ? 'translate(120 0) scale(-1 1)' : undefined}>
            <Profile dot={pose !== 'side'} />
          </g>
        )}
      </g>
    </svg>
  );
}
