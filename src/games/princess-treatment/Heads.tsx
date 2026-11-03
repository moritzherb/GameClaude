/*
 * The two buttons of Princess/King Treatment: a princess's head and a king's head, drawn here so
 * they look the same on every phone. They sway, blink now and then and the princess's tiara
 * sparkles (CSS in global.css, .ph-…); the one tapped hops, the other steps back.
 */

export type Royal = 'princess' | 'king';

const SKIN = '#ffd8bd';
const CHEEK = '#ff8fa3';
const EYE = '#2a1d18';
const GOLD = '#ffd34d';
const GOLD_EDGE = '#d99a00';

function Princess() {
  return (
    <svg className="ph-svg" viewBox="0 0 120 130" aria-hidden="true">
      {/* Long hair behind the face. */}
      <path d="M18 70 C14 34 38 16 60 16 C82 16 106 34 102 70 C100 96 106 112 98 124 L22 124 C14 112 20 96 18 70 Z" fill="#b8692e" />
      <circle cx="60" cy="70" r="32" fill={SKIN} />
      {/* Fringe. */}
      <path d="M27 66 C28 40 44 30 60 30 C77 30 93 40 93 66 C85 52 72 46 60 48 C49 46 35 52 27 66 Z" fill="#b8692e" />
      <circle cx="41" cy="82" r="6.5" fill={CHEEK} opacity="0.5" />
      <circle cx="79" cy="82" r="6.5" fill={CHEEK} opacity="0.5" />
      <g className="ph-eyes">
        <ellipse cx="47" cy="71" rx="4.2" ry="5.4" fill={EYE} />
        <ellipse cx="73" cy="71" rx="4.2" ry="5.4" fill={EYE} />
        <circle cx="48.5" cy="69" r="1.4" fill="#fff" />
        <circle cx="74.5" cy="69" r="1.4" fill="#fff" />
      </g>
      <path d="M41 64 l-3.5 -3 M45 62.5 l-1.5 -3.5 M79 64 l3.5 -3 M75 62.5 l1.5 -3.5" stroke={EYE} strokeWidth="2" strokeLinecap="round" />
      <path d="M50 88 Q60 97 70 88" stroke="#d6455d" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {/* The tiara. */}
      <g className="ph-crown">
        <path d="M37 36 L45 22 L52 31 L60 12 L68 31 L75 22 L83 36 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="60" cy="25" r="4.2" fill="#ff5fa2" stroke="#d6337f" strokeWidth="1.2" />
        <circle cx="45.5" cy="29" r="2.4" fill="#7fd6ff" />
        <circle cx="74.5" cy="29" r="2.4" fill="#7fd6ff" />
      </g>
      <g className="ph-sparkles" fill="#fff6b0">
        <path className="ph-spark a" d="M96 20 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" />
        <path className="ph-spark b" d="M22 34 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5 Z" />
      </g>
    </svg>
  );
}

function King() {
  return (
    <svg className="ph-svg" viewBox="0 0 120 130" aria-hidden="true">
      {/* Hair at the sides, under the crown. */}
      <path d="M26 74 C22 52 30 40 42 38 L40 70 Z M94 74 C98 52 90 40 78 38 L80 70 Z" fill="#6b4226" />
      <circle cx="60" cy="72" r="32" fill={SKIN} />
      {/* The beard round the chin, the moustache over the mouth. */}
      <path d="M28 74 C30 104 44 120 60 120 C76 120 90 104 92 74 C86 90 75 97 60 97 C45 97 34 90 28 74 Z" fill="#7a4a2a" />
      <circle cx="40" cy="82" r="6" fill={CHEEK} opacity="0.4" />
      <circle cx="80" cy="82" r="6" fill={CHEEK} opacity="0.4" />
      <path d="M58 92 Q60 96 62 92" stroke="#5b351c" strokeWidth="2" fill="none" />
      <path d="M43 89 C49 82 55 83 60 88 C65 83 71 82 77 89 C71 93 65 92 60 90 C55 92 49 93 43 89 Z" fill="#5b351c" />
      <ellipse cx="60" cy="80" rx="5.5" ry="4.5" fill="#f0b48f" />
      <g className="ph-eyes">
        <circle cx="47" cy="70" r="4.4" fill={EYE} />
        <circle cx="73" cy="70" r="4.4" fill={EYE} />
        <circle cx="48.4" cy="68.4" r="1.4" fill="#fff" />
        <circle cx="74.4" cy="68.4" r="1.4" fill="#fff" />
      </g>
      <path d="M39 61 L54 59 M66 59 L81 61" stroke="#5b351c" strokeWidth="4" strokeLinecap="round" />
      {/* The crown. */}
      <g className="ph-crown">
        <path d="M31 50 L31 20 L44 34 L52 12 L60 30 L68 12 L76 34 L89 20 L89 50 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="31" y="42" width="58" height="9" rx="2.5" fill="#f2b705" stroke={GOLD_EDGE} strokeWidth="1.6" />
        <circle cx="45" cy="46.5" r="3" fill="#e63946" />
        <circle cx="60" cy="46.5" r="3.6" fill="#3a86ff" />
        <circle cx="75" cy="46.5" r="3" fill="#2ec27e" />
        <circle cx="31" cy="20" r="3" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="1.4" />
        <circle cx="52" cy="12" r="3" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="1.4" />
        <circle cx="68" cy="12" r="3" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="1.4" />
        <circle cx="89" cy="20" r="3" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="1.4" />
      </g>
    </svg>
  );
}

/** One head as a big button. `chosen`: what the table settled on (null: not yet). */
export function Head({ who, label, chosen, onPick }: { who: Royal; label: string; chosen: Royal | null; onPick: (r: Royal) => void }) {
  const state = chosen == null ? '' : chosen === who ? ' on' : ' off';
  return (
    <button type="button" className={`ph-head ${who}${state}`} aria-pressed={chosen === who} onClick={() => onPick(who)}>
      <span className="ph-art">{who === 'princess' ? <Princess /> : <King />}</span>
      <span className="ph-label">{label}</span>
    </button>
  );
}
