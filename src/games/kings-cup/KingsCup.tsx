import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import { newDeck, rankLabel, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { shuffle } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { layRing, type Slot } from './ring';
import { CARD_RULES, isKing, LAST_KING_RULE, type CardRule } from './rules';

interface State {
  /** All 52 cards, face down in a messy circle: cards[i] lies at slots[i]. */
  cards: Card[];
  slots: Slot[];
  taken: boolean[];
  turn: number;
  /** The card just drawn by the current player (null = not drawn yet). */
  current: Card | null;
  kings: number;
  questionMasterId: string | null;
  mates: [string, string][];
  houseRules: string[];
  over: boolean;
}

const fresh = (): State => ({
  cards: shuffle(newDeck()),
  slots: layRing(52),
  taken: Array<boolean>(52).fill(false),
  turn: 0,
  current: null,
  kings: 0,
  questionMasterId: null,
  mates: [],
  houseRules: [],
  over: false,
});

export default function KingsCup({ players, exit }: GameProps) {
  // Groups who know the game only see each card's rule name, not the explanation.
  const known = useApp().knows('kings-cup');
  const [s, setS] = useState<State>(fresh);
  const [ruleDraft, setRuleDraft] = useState('');
  const drawing = useRef(false);
  const timer = useRef<number>(undefined);
  // Where the tapped card lay, so the big card can fly out from there.
  const from = useRef<Slot | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const player = players[s.turn % players.length];
  const byId = (id: string) => players.find((p) => p.id === id);
  const lastKing = s.current && isKing(s.current) && s.kings === 4;
  const rule = s.current ? (lastKing ? LAST_KING_RULE : CARD_RULES[s.current.value]) : null;
  const myMate = s.mates.find(([a]) => a === player.id)?.[1];
  const left = s.taken.filter((t) => !t).length;

  const draw = (i: number) => {
    if (s.current || drawing.current || s.over || s.taken[i]) return;
    drawing.current = true;
    from.current = s.slots[i];
    const card = s.cards[i];
    const kings = s.kings + (isKing(card) ? 1 : 0);
    setS({
      ...s,
      taken: s.taken.map((t, j) => t || j === i),
      current: card,
      kings,
      questionMasterId: card.value === 12 ? player.id : s.questionMasterId,
    });
    timer.current = window.setTimeout(() => {
      if (isKing(card) && kings === 4) celebrate();
      else {
        sfx.tick();
        buzz(isKing(card) ? [40, 40, 80] : 20);
      }
    }, 650);
  };

  const next = () => {
    drawing.current = false;
    setRuleDraft('');
    // The 4th King or an empty deck ends the game.
    if (lastKing || left === 0) return setS({ ...s, over: true });
    setS({ ...s, current: null, turn: (s.turn + 1) % players.length });
  };

  const addRule = () => {
    const text = ruleDraft.trim();
    if (!text) return;
    sfx.pop();
    buzz();
    setS({ ...s, houseRules: [...s.houseRules, text] });
    setRuleDraft('');
  };

  const pickMate = (mate: Player) =>
    setS({ ...s, mates: [...s.mates.filter(([a]) => a !== player.id), [player.id, mate.id]] });

  const effects = (
    <ActiveEffects
      questionMaster={s.questionMasterId ? byId(s.questionMasterId) : undefined}
      mates={s.mates.map(([a, b]) => [byId(a), byId(b)] as const)}
      houseRules={s.houseRules}
    />
  );

  if (s.over) {
    return (
      <div className="kc">
        <div className="bd-head">
          <span className="kicker">Game over</span>
          <h2 className="bd-title big">{s.kings === 4 ? `${player.name} drank the King’s Cup` : 'Deck’s empty!'}</h2>
          <p className="lead">{52 - left} cards drawn.</p>
        </div>
        {effects}
        <div className="sticky-action stack">
          <BigButton onClick={() => setS(fresh())}>Play again</BigButton>
          <BigButton variant="glass" onClick={exit}>
            Back to games
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="kc">
      <div className="kc-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: player.color }}>
            {player.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{player.name}</span>
            <span className="bd-player-sub">{s.current ? 'drew a card' : 'your turn'}</span>
          </span>
        </div>
        <div className="kc-counters">
          <span className="kc-kings" aria-label={`${s.kings} of 4 kings drawn`}>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} className={n <= s.kings ? 'on' : ''}>
                👑
              </i>
            ))}
          </span>
          <span className="kc-left">{left} cards left</span>
        </div>
      </div>

      <div className="kc-stage">
        <div className={`kc-ring${s.current ? ' revealing' : ''}`}>
          {s.slots.map((slot, i) =>
            s.taken[i] ? null : (
              <button
                key={i}
                type="button"
                className="kc-slot"
                style={{ left: `${slot.x}%`, top: `${slot.y}%`, '--rot': `${slot.rot}deg` } as CSSProperties}
                disabled={!!s.current}
                aria-label="Face-down card"
                onClick={() => {
                  sfx.pop();
                  buzz(12);
                  draw(i);
                }}
              />
            ),
          )}
          <KingCrown kings={s.kings} />
          {!s.current && !known && <span className="kc-ring-hint">Pick any card</span>}
          {s.current && rule && <Reveal key={52 - left} card={s.current} rule={rule} finale={!!lastKing} from={from.current} />}
        </div>
      </div>

      {s.current?.value === 8 && (
        <div className="kc-action">
          <span className="kc-action-label">Who’s your mate?</span>
          <div className="pick-grid">
            {players
              .filter((p) => p.id !== player.id)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pick-chip${myMate === p.id ? ' selected' : ''}`}
                  style={{ '--chip': p.color } as CSSProperties}
                  onClick={() => {
                    sfx.pop();
                    buzz();
                    pickMate(p);
                  }}
                >
                  <span className="pick-chip-avatar">{p.avatar}</span>
                  <span className="pick-chip-name">{p.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {s.current?.value === 11 && (
        <form
          className="kc-action"
          onSubmit={(e) => {
            e.preventDefault();
            addRule();
          }}
        >
          <label className="kc-action-label" htmlFor="kc-rule">
            Write down your rule (optional)
          </label>
          <div className="add-player">
            <input
              id="kc-rule"
              className="add-player-input"
              value={ruleDraft}
              maxLength={80}
              placeholder="e.g. No first names"
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => setRuleDraft(e.target.value)}
            />
            <button type="submit" className="add-player-btn" aria-label="Save rule" disabled={!ruleDraft.trim()}>
              ✓
            </button>
          </div>
        </form>
      )}

      {effects}

      {/* Always there (hidden while picking) so the circle doesn't jump when a card is drawn. */}
      <div className={`sticky-action${s.current ? '' : ' kc-idle'}`}>
        <BigButton size="xl" variant={lastKing ? 'primary' : 'light'} onClick={next} disabled={!s.current}>
          {lastKing || left === 0 ? 'Finish game' : `Next: ${players[(s.turn + 1) % players.length].name} →`}
        </BigButton>
      </div>
    </div>
  );
}

/**
 * The drawn card: flies out of the circle into the middle, grows big and flips face up.
 * Tap it to turn it over and read the rule on the back; tap again for the card.
 */
function Reveal({ card, rule, finale, from }: { card: Card; rule: CardRule; finale: boolean; from: Slot | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // Half turns so far: 0 = still face down, odd = card face, even = the rule.
  const [turns, setTurns] = useState(0);
  const known = useApp().knows('kings-cup');
  useLayoutEffect(() => {
    const el = ref.current;
    const flip = window.setTimeout(() => setTurns(1), 160);
    const ring = el?.parentElement;
    if (el && ring && from && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Measured in the ring's own coordinates, so it lines up even if the page moves.
      const size = ring.offsetWidth;
      const dx = ((from.x - 50) / 100) * size;
      const dy = ((from.y - 50) / 100) * size;
      const scale = (0.074 * size) / el.offsetWidth;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) rotate(${from.rot}deg) scale(${scale})` }, { transform: 'translate(0, 0) rotate(0deg) scale(1)' }],
        { duration: 620, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    }
    return () => window.clearTimeout(flip);
  }, [from]);

  const showsRule = turns > 0 && turns % 2 === 0;
  return (
    <div ref={ref} className="kc-reveal">
      <button
        type="button"
        className="kc-big"
        aria-label={showsRule ? `${rule.title}: ${rule.text} Tap to see the card.` : `${rankLabel(card.value)} of ${card.suit}. Tap for the rule.`}
        disabled={turns === 0}
        onClick={() => {
          sfx.tick();
          buzz(10);
          setTurns((t) => t + 1);
        }}
      >
        <span className="kc-big-inner" style={{ transform: `rotateY(${180 * (turns + 1)}deg)` }}>
          <CardFace card={card} />
          {turns === 0 ? (
            <span className="pcard-face pcard-back" />
          ) : (
            <span className={`pcard-face kc-rule-face${finale ? ' finale' : ''}`}>
              <span className="kc-rule-face-emoji">{rule.emoji}</span>
              <span className="kc-rule-face-title">{rule.title}</span>
              <span className="kc-rule-face-text">{rule.text}</span>
            </span>
          )}
        </span>
      </button>
      {!known && turns > 0 && <span className="kc-big-hint">{showsRule ? 'Tap for the card' : 'Tap for the rule'}</span>}
    </div>
  );
}

/** A crown in the middle while someone picks: it idles gently, and each King drawn lights one of its four tips. */
function KingCrown({ kings }: { kings: number }) {
  const tips = [
    [13, 30],
    [37, 20],
    [63, 20],
    [87, 30],
  ];
  return (
    <span className="kc-crown-wrap" role="img" aria-label={`${kings} of 4 Kings drawn`}>
      <span className="kc-crown-glow" />
      <svg className="kc-crown" viewBox="0 0 100 100">
        <path className="kc-crown-body" d="M18 70 13 32 27 49 37 22 50 47 63 22 73 49 87 32 82 70z" />
        <rect className="kc-crown-band" x="17" y="66" width="66" height="13" rx="3" />
        <circle className="kc-crown-gem" cx="35" cy="72.5" r="3.2" />
        <circle className="kc-crown-gem" cx="50" cy="72.5" r="3.2" />
        <circle className="kc-crown-gem" cx="65" cy="72.5" r="3.2" />
        {tips.map(([x, y], i) => (
          <circle key={i} className={`kc-crown-tip${i < kings ? ' on' : ''}`} cx={x} cy={y} r="5.5" />
        ))}
      </svg>
    </span>
  );
}

function ActiveEffects({
  questionMaster,
  mates,
  houseRules,
}: {
  questionMaster?: Player;
  mates: (readonly [Player | undefined, Player | undefined])[];
  houseRules: string[];
}) {
  if (!questionMaster && !mates.length && !houseRules.length) return null;
  return (
    <section className="panel kc-effects">
      <h3 className="section-title">In play</h3>
      {questionMaster && (
        <div className="kc-effect">
          <span className="kc-effect-icon">❓</span>
          <span>
            <strong>{questionMaster.name}</strong> is Question Master
          </span>
        </div>
      )}
      {mates.map(([a, b], i) =>
        a && b ? (
          <div key={i} className="kc-effect">
            <span className="kc-effect-icon">🤝</span>
            <span>
              <strong>{a.name}</strong> drinks → <strong>{b.name}</strong> drinks
            </span>
          </div>
        ) : null,
      )}
      {houseRules.map((r, i) => (
        <div key={i} className="kc-effect">
          <span className="kc-effect-icon">📜</span>
          <span>{r}</span>
        </div>
      ))}
    </section>
  );
}
