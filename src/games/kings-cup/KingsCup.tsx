import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import DeckCount from '../../components/DeckCount';
import { CardFace } from '../../components/PlayingCard';
import { newDeck, rankLabel, type Card, type Suit } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { unfill } from '../../lib/noAutofill';
import { t, tx } from '../../i18n';
import { shuffle } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { layRing, SLOT_WIDTH, type Slot } from './ring';
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
  /** Only one pair of mates at a time: a new 8 replaces them. */
  mate: [string, string] | null;
  /** Only one house rule at a time: a new Jack replaces it. */
  rule: string | null;
  /** Who drew the 4th King and drank the cup. */
  cupBy: string | null;
  over: boolean;
}

/** Suit names for the big card's label (lowercase, as the English label always read). */
const SUIT_LABEL: Record<Suit, string> = { hearts: tx('hearts'), diamonds: tx('diamonds'), spades: tx('spades'), clubs: tx('clubs') };

/** Fills {placeholders} in an already translated text with elements, e.g. a bold name. */
function rich(text: string, parts: Record<string, ReactNode>) {
  return text.split(/\{(\w+)\}/).map((piece, i) => <Fragment key={i}>{i % 2 ? parts[piece] : piece}</Fragment>);
}

const fresh = (): State => ({
  cards: shuffle(newDeck()),
  slots: layRing(52),
  taken: Array<boolean>(52).fill(false),
  turn: 0,
  current: null,
  kings: 0,
  questionMasterId: null,
  mate: null,
  rule: null,
  cupBy: null,
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
  const myMate = s.mate?.[0] === player.id ? s.mate[1] : undefined;
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
      // A new 8 or Jack ends the old mates or rule (the drawer may set new ones, or not).
      mate: card.value === 8 ? null : s.mate,
      rule: card.value === 11 ? null : s.rule,
      cupBy: isKing(card) && kings === 4 ? player.id : s.cupBy,
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
    // The 4th King only empties the cup: the game goes on until every card is drawn.
    if (left === 0) return setS({ ...s, over: true });
    setS({ ...s, current: null, turn: (s.turn + 1) % players.length });
  };

  const addRule = () => {
    const text = ruleDraft.trim();
    if (!text) return;
    sfx.pop();
    buzz();
    setS({ ...s, rule: text });
    setRuleDraft('');
  };

  const pickMate = (mate: Player) => setS({ ...s, mate: [player.id, mate.id] });

  const effects = (
    <ActiveEffects
      questionMaster={s.questionMasterId ? byId(s.questionMasterId) : undefined}
      mate={s.mate ? [byId(s.mate[0]), byId(s.mate[1])] : null}
      rule={s.rule}
    />
  );

  if (s.over) {
    return (
      <div className="kc">
        <div className="bd-head">
          <span className="kicker">{t('Game over')}</span>
          <h2 className="bd-title big">{t('Deck’s empty!')}</h2>
          <p className="lead">
            {s.cupBy ? t('{name} drank the King’s Cup', { name: byId(s.cupBy)?.name ?? '' }) : t('{n} cards drawn.', { n: 52 - left })}
          </p>
        </div>
        {effects}
        <div className="sticky-action stack">
          <BigButton onClick={() => setS(fresh())}>{t('Play again')}</BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="kc fill">
      <div className="kc-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: player.color }}>
            {player.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{player.name}</span>
            <span className="bd-player-sub">{s.current ? t('drew a card') : t('your turn')}</span>
          </span>
        </div>
        <DeckCount left={left} />
      </div>

      <div className="kc-stage">
        <div className={`kc-ring${s.current ? ' revealing' : ''}`}>
          <div className="kc-slots">
            {s.slots.map((slot, i) =>
              s.taken[i] ? null : (
                <button
                  key={i}
                  type="button"
                  className="kc-slot"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%`, '--rot': `${slot.rot}deg` } as CSSProperties}
                  disabled={!!s.current}
                  aria-label={t('Face-down card')}
                  onClick={() => {
                    sfx.pop();
                    buzz(12);
                    draw(i);
                  }}
                />
              ),
            )}
          </div>
          <KingCrown kings={s.kings} />
          {!s.current && !known && <span className="kc-ring-hint">{t('Pick any card')}</span>}
          {s.current && rule && <Reveal key={52 - left} card={s.current} rule={rule} finale={!!lastKing} from={from.current} />}
        </div>
      </div>

      {s.current?.value === 8 && (
        <div className="kc-action">
          <span className="kc-action-label">{t('Who’s your mate?')}</span>
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
            {t('Write down your rule (optional)')}
          </label>
          <div className="add-player">
            <input
              id="kc-rule"
              type="search"
              name="prost-rule"
              className="add-player-input"
              value={ruleDraft}
              maxLength={80}
              placeholder={unfill(t('e.g. No first names'))}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => setRuleDraft(e.target.value)}
            />
            <button type="submit" className="add-player-btn" aria-label={t('Save rule')} disabled={!ruleDraft.trim()}>
              ✓
            </button>
          </div>
        </form>
      )}

      {effects}

      {/* Always there (hidden while picking) so the circle doesn't jump when a card is drawn. */}
      <div className={`sticky-action${s.current ? '' : ' kc-idle'}`}>
        <BigButton size="xl" variant={lastKing ? 'primary' : 'light'} onClick={next} disabled={!s.current}>
          {left === 0 ? t('Finish game') : <NextName text={t('Next: {name} →')} name={players[(s.turn + 1) % players.length].name} />}
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
  const inner = useRef<HTMLSpanElement>(null);
  // Half turns: odd = card face, even = the rule. Starts face up; the first flip is animated below.
  const [turns, setTurns] = useState(1);
  // Until the card has landed, its back is the card back (not the rule) and it can't be tapped.
  const [landed, setLanded] = useState(false);
  const known = useApp().knows('kings-cup');
  useLayoutEffect(() => {
    const el = ref.current;
    const face = inner.current;
    const ring = el?.parentElement;
    if (!el || !face || !ring || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLanded(true);
      return;
    }
    // Flight and flip both run as compositor animations, with no React render until the card lands.
    if (from) {
      // Measured in the ring's own coordinates, so it lines up even if the page moves.
      const size = ring.offsetWidth;
      const dx = ((from.x - 50) / 100) * size;
      const dy = ((from.y - 50) / 100) * size;
      const scale = ((SLOT_WIDTH / 100) * size) / el.offsetWidth;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) rotate(${from.rot}deg) scale(${scale})` }, { transform: 'translate(0, 0) rotate(0deg) scale(1)' }],
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
    const flip = face.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(360deg)' }], {
      duration: 650,
      delay: 90,
      easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
      fill: 'backwards',
    });
    flip.onfinish = () => setLanded(true);
    return () => flip.cancel();
  }, [from]);

  const showsRule = turns % 2 === 0;
  const title = t(rule.title);
  const text = t(rule.text);
  return (
    <div ref={ref} className="kc-reveal">
      <button
        type="button"
        className="kc-big"
        aria-label={
          showsRule
            ? t('{title}: {text} Tap to see the card.', { title, text })
            : t('{rank} of {suit}. Tap for the rule.', { rank: rankLabel(card.value), suit: t(SUIT_LABEL[card.suit]) })
        }
        disabled={!landed}
        onClick={() => {
          sfx.tick();
          buzz(10);
          setTurns((t) => t + 1);
        }}
      >
        <span ref={inner} className="kc-big-inner" style={{ transform: `rotateY(${180 * (turns + 1)}deg)` }}>
          <CardFace card={card} />
          {landed ? (
            <span className={`pcard-face kc-rule-face${finale ? ' finale' : ''}`}>
              <span className="kc-rule-face-emoji">{rule.emoji}</span>
              <span className="kc-rule-face-title">{title}</span>
              <span className="kc-rule-face-text">{text}</span>
            </span>
          ) : (
            <span className="pcard-face pcard-back" />
          )}
        </span>
      </button>
      {!known && landed && <span className="kc-big-hint">{showsRule ? t('Tap for the card') : t('Tap for the rule')}</span>}
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
    <span className="kc-crown-wrap" role="img" aria-label={t('{n} of 4 Kings drawn', { n: kings })}>
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
  mate,
  rule,
}: {
  questionMaster?: Player;
  mate: [Player | undefined, Player | undefined] | null;
  rule: string | null;
}) {
  const [a, b] = mate ?? [];
  if (!questionMaster && !(a && b) && !rule) return null;
  return (
    <section className="panel kc-effects">
      <h3 className="section-title">{t('In play')}</h3>
      {questionMaster && (
        <div className="kc-effect">
          <span className="kc-effect-icon">❓</span>
          <span>{rich(t('{name} is Question Master'), { name: <strong>{questionMaster.name}</strong> })}</span>
        </div>
      )}
      {a && b && (
        <div className="kc-effect">
          <span className="kc-effect-icon">🤝</span>
          <span>{rich(t('{a} is mates with {b}'), { a: <strong>{a.name}</strong>, b: <strong>{b.name}</strong> })}</span>
        </div>
      )}
      {rule && (
        <div className="kc-effect">
          <span className="kc-effect-icon">📜</span>
          <span>{rule}</span>
        </div>
      )}
    </section>
  );
}
