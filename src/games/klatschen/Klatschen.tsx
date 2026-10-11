import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import Sheet from '../../components/Sheet';
import { t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { shuffle } from '../../lib/random';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';
import { byId, DECK, GLASS_ID, STANDING_RULES, type TaskCard } from './cards';

interface State {
  /** Card ids, a face-down stack: the next one drawn is cards[drawn]. */
  cards: string[];
  drawn: number;
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
  drawn: 0,
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

/** How long the slap takes before the card comes off the stack (the CSS animations match). */
const SLAP_MS = 230;

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
  const left = s.cards.length - s.drawn;
  const [slapping, setSlapping] = useState(false);
  // The KLATSCH! burst stays a moment longer than the slap itself (it pops over the flying card).
  const [burst, setBurst] = useState(0);
  const timer = useRef<number>(undefined);
  const burstTimer = useRef<number>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(burstTimer.current);
    },
    [],
  );
  const card = s.current ? byId(s.current) : null;
  const lastGlass = card?.id === GLASS_ID && s.glass === 4;

  /** Slap the stack: a hand comes down, KLATSCH!, and the top card flies off. */
  const slap = () => {
    if (s.current || slapping || left === 0) return;
    setSlapping(true);
    setBurst((n) => n + 1);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(0), 900);
    buzz([30, 20, 50]);
    sfx.pop();
    timer.current = window.setTimeout(() => {
      setSlapping(false);
      const id = s.cards[s.drawn];
      const c = byId(id);
      const glass = s.glass + (id === GLASS_ID ? 1 : 0);
      setS({
        ...s,
        drawn: s.drawn + 1,
        current: id,
        glass,
        roles: c.role ? { ...s.roles, [c.role]: player.id } : s.roles,
        loser: glass === 4 && id === GLASS_ID ? player.id : s.loser,
      });
      if (glass === 4 && id === GLASS_ID) celebrate();
      else {
        sfx.tick();
        buzz(id === GLASS_ID ? [40, 40, 80] : 15);
      }
    }, SLAP_MS);
  };

  const next = () => {
    if (lastGlass || left === 0) return setS({ ...s, over: true });
    setS({ ...s, current: null, turn: (s.turn + 1) % players.length });
  };

  const qm = byPlayer(s.roles.questions);
  const thumb = byPlayer(s.roles.thumb);

  return (
    <div className="kl fill">
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

      {/* The standing rules and who holds a role, in one row of small pills. */}
      <div className="kl-pills">
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

      {/* A pop-art table: the stack in the middle. Slap it! */}
      <div className={`kl-table${slapping ? ' slapping' : ''}${card ? ' revealed' : ''}`}>
        <button type="button" className="kl-stack" onClick={slap} disabled={!!s.current || slapping} aria-label={t('Slap the stack')}>
          {left > 2 && <span className="kl-stack-card under2" />}
          {left > 1 && <span className="kl-stack-card under1" />}
          {left > 0 && (
            <span className="kl-stack-card top">
              <span className="kl-back-logo">👏</span>
              <span className="kl-back-word">{t('Klatschen')}</span>
            </span>
          )}
          <span className="kl-stack-left">{t('{n} left', { n: left })}</span>
        </button>
        {!s.current && !slapping && <span className="kl-slap-hint">{known ? t('Slap it!') : t('Slap the stack!')}</span>}
        {slapping && (
          <span className="kl-hand" aria-hidden>
            ✋
          </span>
        )}
        {burst > 0 && (
          <span className="kl-burst" key={burst} aria-hidden>
              <svg viewBox="0 0 200 140">
                <path d="M100 6l14 34 36-22-12 36 42 2-34 22 32 26-42-6 6 38-30-26-14 30-12-32-32 22 8-38-42 4 32-26L14 54l42-2-12-36 36 22z" />
              </svg>
            <span>{t('SLAP!')}</span>
          </span>
        )}
        {card && <Reveal key={s.drawn} card={card} finale={lastGlass} glass={s.glass} />}
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

/** The slapped card: shoots off the stack, spins and lands face up, comic style. */
function Reveal({ card, finale, glass }: { card: TaskCard; finale: boolean; glass: number }) {
  const isGlass = card.id === GLASS_ID;
  return (
    <div className="kl-reveal" role="status" aria-label={`${t(card.title)}: ${t(card.text)}`}>
      <span className={`kl-card${finale ? ' finale' : ''}`} style={{ '--card': card.color } as CSSProperties}>
        <span className="kl-card-emoji">{card.emoji}</span>
        <span className="kl-card-title">{finale ? t('The 4th clap glass!') : t(card.title)}</span>
        <span className="kl-card-text">
          {finale ? t('You clap the whole glass in the middle. Down in one!') : isGlass ? `${t(card.text)} (${glass}/4)` : t(card.text)}
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
