import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import { newDeck, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { shuffle } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { layRing, type Slot } from './ring';
import { CARD_RULES, isKing, LAST_KING_RULE } from './rules';

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
  const from = useRef<FlyFrom | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const player = players[s.turn % players.length];
  const byId = (id: string) => players.find((p) => p.id === id);
  const lastKing = s.current && isKing(s.current) && s.kings === 4;
  const rule = s.current ? (lastKing ? LAST_KING_RULE : CARD_RULES[s.current.value]) : null;
  const myMate = s.mates.find(([a]) => a === player.id)?.[1];
  const left = s.taken.filter((t) => !t).length;

  const draw = (i: number, el: HTMLElement) => {
    if (s.current || drawing.current || s.over || s.taken[i]) return;
    drawing.current = true;
    const box = el.getBoundingClientRect();
    from.current = { x: box.left + box.width / 2, y: box.top + box.height / 2, width: el.offsetWidth, rot: s.slots[i].rot };
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
              onClick={(e) => {
                sfx.pop();
                buzz(12);
                draw(i, e.currentTarget);
              }}
            />
          ),
        )}
        <KingsCupGlass kings={s.kings} />
        {!s.current && !known && <span className="kc-ring-hint">Pick any card</span>}
        {s.current && <Reveal key={52 - left} card={s.current} from={from.current} />}
      </div>

      {rule && s.current ? (
        <div className={`kc-rule${lastKing ? ' finale' : ''}`}>
          <span className="kc-rule-emoji">{rule.emoji}</span>
          <span className="kc-rule-text">
            <span className="kc-rule-title">{rule.title}</span>
            {!known && <span className="kc-rule-body">{rule.text}</span>}
            {s.current.value === 13 && !lastKing && (
              <span className="kc-rule-note">
                {4 - s.kings} King{4 - s.kings > 1 ? 's' : ''} left. Whoever draws the last one drinks the cup.
              </span>
            )}
            {s.current.value === 12 && <span className="kc-rule-note">{player.name} is the Question Master now.</span>}
          </span>
        </div>
      ) : null}

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

      {s.current && (
        <div className="sticky-action">
          <BigButton size="xl" variant={lastKing ? 'primary' : 'light'} onClick={next}>
            {lastKing || left === 0 ? 'Finish game' : `Next: ${players[(s.turn + 1) % players.length].name} →`}
          </BigButton>
        </div>
      )}
    </div>
  );
}

interface FlyFrom {
  x: number;
  y: number;
  width: number;
  rot: number;
}

/** The drawn card: flies out of the circle into the middle, grows big and flips over. */
function Reveal({ card, from }: { card: Card; from: FlyFrom | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    const flip = window.setTimeout(() => setUp(true), 160);
    if (el && from && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const to = el.getBoundingClientRect();
      const dx = from.x - (to.left + to.width / 2);
      const dy = from.y - (to.top + to.height / 2);
      const scale = from.width / el.offsetWidth;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) rotate(${from.rot}deg) scale(${scale})` }, { transform: 'translate(0, 0) rotate(0deg) scale(1)' }],
        { duration: 620, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    }
    return () => window.clearTimeout(flip);
  }, [from]);
  return (
    <div ref={ref} className="kc-reveal">
      <PlayingCard card={card} faceUp={up} size="xl" />
    </div>
  );
}

/** The King's Cup in the middle of the circle: every King pours a bit more in. */
function KingsCupGlass({ kings }: { kings: number }) {
  const level = 92 - kings * 17;
  return (
    <svg className="kc-cup" viewBox="0 0 100 100" aria-label={`King’s Cup, ${kings} of 4 poured in`} role="img">
      <defs>
        <clipPath id="kc-cup-inside">
          <path d="M26 18h48l-6 68a6 6 0 0 1-6 5H38a6 6 0 0 1-6-5z" />
        </clipPath>
      </defs>
      <g clipPath="url(#kc-cup-inside)">
        <rect className="kc-cup-drink" x="0" y={level} width="100" height={100 - level} />
        {kings > 0 && <rect className="kc-cup-foam" x="0" y={level - 4} width="100" height="5" />}
      </g>
      <path className="kc-cup-glass" d="M26 18h48l-6 68a6 6 0 0 1-6 5H38a6 6 0 0 1-6-5z" />
    </svg>
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
