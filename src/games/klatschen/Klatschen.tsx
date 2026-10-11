import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import Sheet from '../../components/Sheet';
import { t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { shuffle } from '../../lib/random';
import { useApp } from '../../state/AppState';
import { layRing, SLOT_WIDTH, type Slot } from '../kings-cup/ring';
import type { GameProps } from '../types';
import { byId, DECK, GLASS_ID, STANDING_RULES, type TaskCard } from './cards';

interface State {
  /** Card ids, face down in a circle: cards[i] lies at slots[i]. */
  cards: string[];
  slots: Slot[];
  taken: boolean[];
  turn: number;
  current: string | null;
  /** Clap glass cards drawn so far (the 4th ends the game). */
  glass: number;
  /** Who holds a role, by player id. */
  roles: { questions: string | null; thumb: string | null };
  /** Who drew the 4th clap glass. */
  loser: string | null;
  over: boolean;
}

const fresh = (): State => ({
  cards: shuffle(DECK),
  slots: layRing(DECK.length),
  taken: Array<boolean>(DECK.length).fill(false),
  turn: 0,
  current: null,
  glass: 0,
  roles: { questions: null, thumb: null },
  loser: null,
  over: false,
});

export default function Klatschen({ players, exit }: GameProps) {
  const known = useApp().knows('klatschen');
  const [s, setS] = useState<State | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  /* ---------- Before the game: the three standing rules ---------- */
  if (!s) {
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('The three rules')}</h2>
          <p className="lead">{t('They hold all game long. Whoever breaks one claps 1.')}</p>
        </div>
        <div className="kl-rules">
          {STANDING_RULES.map((r) => (
            <div key={r.text} className="kl-rule">
              <span className="kl-rule-emoji">{r.emoji}</span>
              <span>{t(r.text)}</span>
            </div>
          ))}
        </div>
        {!known && <p className="fine-print">{t('Draw a card each round the table and do what it says. Whoever draws the 4th clap glass claps the glass in the middle, and the game is over.')}</p>}
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setS(fresh())}>
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  const byPlayer = (id: string | null) => (id ? players.find((p) => p.id === id) : undefined);

  if (s.over) {
    const loser = byPlayer(s.loser);
    return (
      <div className="bd">
        <div className="bd-head center">
          <span className="kicker">{t('Game over')}</span>
          <span className="kl-end-glass" aria-hidden>
            <Glass level={4} />
          </span>
          <h2 className="bd-title big">{loser ? t('{name} claps the glass!', { name: loser.name }) : t('Deck’s empty!')}</h2>
          <p className="lead">{t('All the way down. Cheers!')}</p>
        </div>
        <div className="sticky-action stack">
          <BigButton onClick={() => setS(fresh())}>{t('Play again')}</BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  }

  return <Table s={s} setS={setS} players={players} known={known} rulesOpen={rulesOpen} setRulesOpen={setRulesOpen} byPlayer={byPlayer} />;
}

function Table({
  s,
  setS,
  players,
  known,
  rulesOpen,
  setRulesOpen,
  byPlayer,
}: {
  s: State;
  setS: (s: State) => void;
  players: GameProps['players'];
  known: boolean;
  rulesOpen: boolean;
  setRulesOpen: (open: boolean) => void;
  byPlayer: (id: string | null) => GameProps['players'][number] | undefined;
}) {
  const player = players[s.turn % players.length];
  const left = s.taken.filter((x) => !x).length;
  const from = useRef<Slot | null>(null);
  const drawing = useRef(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const card = s.current ? byId(s.current) : null;
  const lastGlass = card?.id === GLASS_ID && s.glass === 4;

  const draw = (i: number) => {
    if (s.current || drawing.current || s.taken[i]) return;
    drawing.current = true;
    from.current = s.slots[i];
    const id = s.cards[i];
    const c = byId(id);
    const glass = s.glass + (id === GLASS_ID ? 1 : 0);
    setS({
      ...s,
      taken: s.taken.map((x, j) => x || j === i),
      current: id,
      glass,
      roles: c.role ? { ...s.roles, [c.role]: player.id } : s.roles,
      loser: glass === 4 && id === GLASS_ID ? player.id : s.loser,
    });
    timer.current = window.setTimeout(() => {
      if (glass === 4 && id === GLASS_ID) celebrate();
      else {
        sfx.tick();
        buzz(id === GLASS_ID ? [40, 40, 80] : 20);
      }
    }, 650);
  };

  const next = () => {
    drawing.current = false;
    if (lastGlass || left === 0) return setS({ ...s, over: true });
    setS({ ...s, current: null, turn: (s.turn + 1) % players.length });
  };

  const qm = byPlayer(s.roles.questions);
  const thumb = byPlayer(s.roles.thumb);

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
        <span className="kl-glass-count" aria-label={t('{n} of 4 clap glasses drawn', { n: s.glass })}>
          <Glass level={s.glass} />
          <span>{s.glass}/4</span>
        </span>
      </div>

      <div className="kc-stage">
        {/* The standing rules and who holds a role: small pills in the strip kept free above the circle. */}
        <div className="kc-chips">
          <button type="button" className="kc-chip" onClick={() => setRulesOpen(true)}>
            <span aria-hidden="true">📏</span>
            <span className="kc-chip-text">{t('3 rules')}</span>
          </button>
          {qm && (
            <button type="button" className="kc-chip" aria-label={t('{name} is Question Master', { name: qm.name })} onClick={() => setRulesOpen(true)}>
              <span aria-hidden="true">❓</span>
              <span className="kc-chip-text">{qm.name}</span>
            </button>
          )}
          {thumb && (
            <button type="button" className="kc-chip" aria-label={t('{name} is Thumb Master', { name: thumb.name })} onClick={() => setRulesOpen(true)}>
              <span aria-hidden="true">👍</span>
              <span className="kc-chip-text">{thumb.name}</span>
            </button>
          )}
        </div>
        <div className={`kc-ring${s.current ? ' revealing' : ''}`}>
          <div className="kc-slots">
            {s.slots.map((slot, i) =>
              s.taken[i] ? null : (
                <button
                  key={i}
                  type="button"
                  className="kc-slot kl-slot"
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
          <span className="kl-center" aria-hidden>
            <Glass level={s.glass} />
          </span>
          {!s.current && !known && <span className="kc-ring-hint">{t('Pick any card')}</span>}
          {card && <Reveal key={left} card={card} finale={lastGlass} glass={s.glass} from={from.current} />}
        </div>
      </div>

      <div className={`sticky-action${s.current ? '' : ' kc-idle'}`}>
        <BigButton size="xl" variant={lastGlass ? 'primary' : 'light'} onClick={next} disabled={!s.current}>
          {lastGlass || left === 0 ? t('Finish game') : <NextName text={t('Next: {name} →')} name={players[(s.turn + 1) % players.length].name} />}
        </BigButton>
      </div>

      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} title={t('The three rules')}>
        <div className="kl-rules">
          {STANDING_RULES.map((r) => (
            <div key={r.text} className="kl-rule">
              <span className="kl-rule-emoji">{r.emoji}</span>
              <span>{t(r.text)}</span>
            </div>
          ))}
          {qm && (
            <div className="kl-rule">
              <span className="kl-rule-emoji">❓</span>
              <span>{t('{name} is Question Master', { name: qm.name })}</span>
            </div>
          )}
          {thumb && (
            <div className="kl-rule">
              <span className="kl-rule-emoji">👍</span>
              <span>{t('{name} is Thumb Master', { name: thumb.name })}</span>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

/** The drawn card: flies out of the circle into the middle and turns face up. */
function Reveal({ card, finale, glass, from }: { card: TaskCard; finale: boolean; glass: number; from: Slot | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const face = inner.current;
    const ring = el?.parentElement;
    if (!el || !face || !ring || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (from) {
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
    return () => flip.cancel();
  }, [from]);

  const isGlass = card.id === GLASS_ID;
  return (
    <div ref={ref} className="kc-reveal">
      <span className="kc-big" role="img" aria-label={`${t(card.title)}: ${t(card.text)}`}>
        <span ref={inner} className="kc-big-inner">
          <span className={`pcard-face kl-face${finale ? ' finale' : ''}`} style={{ '--card': card.color } as CSSProperties}>
            <span className="kl-face-emoji">{card.emoji}</span>
            <span className="kl-face-title">{finale ? t('The 4th clap glass!') : t(card.title)}</span>
            <span className="kl-face-text">
              {finale ? t('You clap the whole glass in the middle. Down in one!') : isGlass ? `${t(card.text)} (${glass}/4)` : t(card.text)}
            </span>
          </span>
          <span className="pcard-face pcard-back kl-back" />
        </span>
      </span>
    </div>
  );
}

/** The glass in the middle, filling up with every clap glass card. */
function Glass({ level }: { level: number }) {
  const clip = `kl-in-${useId().replace(/:/g, '')}`;
  const fill = Math.min(4, level) / 4;
  const top = 92 - fill * 62;
  return (
    <svg className="kl-glass" viewBox="0 0 60 100">
      <defs>
        <clipPath id={clip}>
          <path d="M12 26h36l-4 64H16z" />
        </clipPath>
      </defs>
      <path d="M8 18h44l-5 76H13z" className="kl-glass-body" />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y={top} width="60" height="100" className="kl-glass-beer" />
        {fill > 0 && <rect x="0" y={top - 5} width="60" height="6" rx="3" className="kl-glass-foam" />}
      </g>
      <path d="M8 18h44l-5 76H13z" className="kl-glass-rim" />
    </svg>
  );
}
