import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import Tap from '../../components/Tap';
import { getLang, t, tx } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';
import {
  canStop,
  ENTRY,
  gainFor,
  newGame,
  nextTurn,
  roll,
  scoringDice,
  setAside,
  TARGET,
  tooMuch,
  type Face,
  type Game,
} from './logic';

/** Letters on the dice; German poker dice say B (Bube) and D (Dame). */
const FACE_LABEL: Record<Face, string> = { 9: '9', 10: '10', 11: tx('J'), 12: tx('Q'), 13: tx('K'), 14: tx('A') };
const SHAKE_MS = 480;
const EMPTY: Face[] = [];

const fmt = (n: number) => n.toLocaleString(getLang() === 'de' ? 'de-DE' : 'en-US');

export default function FiveThousand({ players, exit }: GameProps) {
  const known = useApp().knows('five-thousand');
  const [starterId, setStarterId] = useState(() => pick(players).id);
  const [g, setG] = useState<Game | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [shaking, setShaking] = useState(false);
  // After a win the winning roll stays on the table with the big 5000; standings come on a tap.
  const [podium, setPodium] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const won = g?.end?.kind === 'won';
  useEffect(() => {
    if (won) celebrate();
  }, [won]);

  /* ---------- Setup: who starts ---------- */
  if (!g) {
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('Who starts?')}</h2>
          {!known && <p className="lead">{t('Then the cup goes round to the left. First to exactly 5000 wins.')}</p>}
        </div>
        <div className="pick-grid">
          {players.map((p) => (
            <Tap
              key={p.id}
              className={`pick-chip${p.id === starterId ? ' selected' : ''}`}
              style={{ '--chip': p.color } as CSSProperties}
              onClick={() => setStarterId(p.id)}
            >
              <span className="pick-chip-avatar">{p.avatar}</span>
              <span className="pick-chip-name">{p.name}</span>
              {p.id === starterId && <span className="pick-chip-badge">{t('Starts')}</span>}
            </Tap>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={() => setStarterId(pick(players).id)}>
          {t('Random pick')}
        </button>
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setG(newGame(players.length, Math.max(0, players.findIndex((p) => p.id === starterId))))}>
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  const me = players[g.current];
  const score = g.scores[g.current];
  const opened = g.opened[g.current];
  const turn = g.turn;

  /* ---------- Someone hit exactly 5000: the standings ---------- */
  if (won && podium) {
    return (
      <div className="bd fk-win">
        <div className="bd-head center">
          <span className="kicker">{t('Exactly 5000!')}</span>
          <span className="bd-avatar xl" style={{ background: me.color }}>
            {me.avatar}
          </span>
          <h2 className="bd-title big">{t('{name} wins!', { name: me.name })}</h2>
        </div>
        <Standings g={g} players={players} />
        <div className="sticky-action stack">
          <BigButton
            onClick={() => {
              setPodium(false);
              setG(null);
            }}
          >
            {t('Play again')}
          </BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  }

  /** Shake the cup for a moment, then run the move (which rolls). */
  const shake = (move: (g: Game) => Game) => {
    if (shaking) return;
    setShaking(true);
    sfx.tick();
    buzz([20, 30, 20, 30, 20]);
    timer.current = window.setTimeout(() => {
      const after = move(g);
      setShaking(false);
      setPicked([]);
      setG(after);
      if (after.phase === 'over') {
        if (after.end?.kind === 'won') return;
        sfx.boo();
        buzz([60, 40, 120]);
      } else sfx.pop();
    }, SHAKE_MS);
  };

  const counts = (f: Face) => turn.roll.filter((x) => x === f).length;
  // A triple is exactly three of a face; it only goes as a whole. Other Kings and Aces count alone.
  const inTriple = (i: number) => counts(turn.roll[i]) === 3;
  const pickable = (i: number) => g.phase === 'choose' && (turn.roll[i] >= 13 || inTriple(i));
  const toggle = (i: number) => {
    if (!pickable(i)) return;
    const f = turn.roll[i];
    sfx.tick();
    buzz(10);
    if (!inTriple(i)) return setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    // Picking one die of a triple picks all three.
    const same = turn.roll.map((x, j) => (x === f ? j : -1)).filter((j) => j >= 0);
    setPicked((p) => (p.includes(i) ? p.filter((x) => turn.roll[x] !== f) : [...p.filter((x) => turn.roll[x] !== f), ...same]));
  };
  const pickAll = () => setPicked(turn.roll.map((_, j) => j).filter((j) => pickable(j)));

  const gain = gainFor(g, picked);
  const over = gain != null && tooMuch(g, gain);
  const total = turn.points + (gain ?? 0);
  const left = turn.roll.length - picked.length;
  const exact = gain != null && score + total === TARGET;
  const allGain = gainFor(
    g,
    turn.roll.map((_, j) => j).filter((j) => pickable(j)),
  );

  return (
    <div className="fk fill">
      <Scoreboard g={g} players={players} />

      <div className="kc-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: me.color }}>
            {me.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{me.name}</span>
            <span className="bd-player-sub">
              {opened || won ? t('{score} · {left} to go', { score: fmt(score), left: fmt(TARGET - score) }) : t('Not in yet · needs 500')}
            </span>
          </span>
        </div>
        <span className="fk-turn-points">
          <span className="fk-turn-num">{fmt(total)}</span>
          <span className="fk-turn-label">{t('this turn')}</span>
        </span>
      </div>

      <Table
        key={`${g.current}-${turn.rolls}-${g.phase === 'roll' ? 'cup' : 'dice'}`}
        roll={g.phase === 'roll' || shaking ? EMPTY : turn.roll}
        picked={won ? scoringDice(turn.roll) : picked}
        pickable={pickable}
        onTap={toggle}
        cup={g.phase === 'roll' || shaking}
        shaking={shaking}
        dead={g.phase === 'over' && !won}
        hint={g.phase === 'roll' && !known ? t('Tap the cup to roll') : null}
        onCup={() => g.phase === 'roll' && shake(roll)}
        bank={
          g.phase === 'choose' && !shaking
            ? {
                // Below 500 and not in yet: nothing to bank, the button says how far it is.
                text: canStop(g, total) || gain == null ? t('Bank') : t('From 500'),
                amount: canStop(g, total) || gain == null ? fmt(total) : t('{n} to go', { n: fmt(ENTRY - total) }),
                disabled: gain == null || over || !canStop(g, total),
                onClick: () => {
                  setPicked([]);
                  setG(setAside(g, picked, 'stop'));
                },
              }
            : null
        }
      />

      {turn.aside.length > 0 && (
        <div className="fk-aside">
          <span className="fk-aside-label">{t('Set aside')}</span>
          <span className="fk-aside-dice">
            {turn.aside.map((f, i) => (
              <span key={i} className={`fk-die sm${f >= 13 ? ' red' : ''}`}>
                {t(FACE_LABEL[f])}
              </span>
            ))}
          </span>
        </div>
      )}

      {g.phase === 'roll' && (
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => shake(roll)} disabled={shaking}>
            {turn.cup === 5 && turn.rolls > 0 ? t('All 5 again 🔥') : turn.cup === 1 ? t('Roll 1 die') : t('Roll {n} dice', { n: turn.cup })}
          </BigButton>
        </div>
      )}

      {g.phase === 'choose' && (
        <>
          <div className="fk-pick-row">
            <span className="fk-pick-info">
              {gain == null
                ? known
                  ? t('Pick your dice')
                  : t('Tap Kings, Aces or a triple to set them aside.')
                : over
                  ? t('That’s over 5000. Pick less.')
                  : t('+{n} points', { n: fmt(gain) })}
            </span>
            {allGain != null && !tooMuch(g, allGain) && picked.length === 0 && (
              <button type="button" className="text-btn" onClick={pickAll}>
                {t('Take all')}
              </button>
            )}
          </div>
          <div className="sticky-action">
            <BigButton size="xl" disabled={gain == null || over || shaking} onClick={() => shake((x) => setAside(x, picked, 'roll'))}>
              {exact ? t('Exactly 5000! 🏆') : gain != null && left === 0 ? t('All 5 back in the cup 🔥') : left === 1 ? t('Roll 1 die again') : t('Roll {n} again', { n: Math.max(left, 1) })}
            </BigButton>
          </div>
        </>
      )}

      {won && (
        <>
          <div className="fk-burst" aria-live="polite">
            <span className="kicker">{t('Exactly 5000!')}</span>
            <span className="fk-burst-num">5000</span>
            <span className="fk-burst-name">{t('{name} wins!', { name: me.name })}</span>
          </div>
          <div className="sticky-action">
            <BigButton size="xl" onClick={() => setPodium(true)}>
              {t('Show the standings')}
            </BigButton>
          </div>
        </>
      )}

      {g.phase === 'over' && g.end && !won && (
        <>
          <TurnVerdict g={g} name={me.name} />
          <div className="sticky-action">
            <BigButton
              size="xl"
              variant="light"
              onClick={() => {
                setPicked([]);
                setG(nextTurn(g));
              }}
            >
              <NextName text={t('Next: {name} →')} name={players[(g.current + 1) % players.length].name} />
            </BigButton>
          </div>
        </>
      )}
    </div>
  );
}

function TurnVerdict({ g, name }: { g: Game; name: string }) {
  const end = g.end!;
  const score = fmt(g.scores[g.current]);
  if (end.kind === 'banked') {
    const firstIn = g.scores[g.current] === end.gained;
    return (
      <div className="bd-result correct">
        <span className="bd-result-emoji">💰</span>
        <span className="bd-result-text">
          <span className="bd-result-title">{t('+{n} banked', { n: fmt(end.gained) })}</span>
          <span className="bd-result-sub">{firstIn ? t('{name} is in with {score}.', { name, score }) : t('{name} now has {score}.', { name, score })}</span>
        </span>
      </div>
    );
  }
  const lost = end.kind === 'nothing' || end.kind === 'too-much' ? end.lost : 0;
  return (
    <div className="bd-result wrong">
      <span className="bd-result-emoji">{end.kind === 'too-much' ? '🫠' : '💥'}</span>
      <span className="bd-result-text">
        <span className="bd-result-title">{end.kind === 'too-much' ? t('Over 5000!') : t('Nothing!')}</span>
        <span className="bd-result-sub">
          {end.kind === 'too-much'
            ? t('The roll is worth {value}, you needed {need}.', { value: fmt(end.value), need: fmt(end.need) }) +
              (lost ? ` ${t('{n} points from this turn are gone.', { n: fmt(lost) })}` : '')
            : end.kind === 'nothing' && end.penalty
              ? t('First roll without points: −{n}.', { n: end.penalty })
              : lost
                ? t('{n} points from this turn are gone.', { n: fmt(lost) })
                : t('No King, no Ace, no triple.')}
        </span>
        <span className="bd-result-card">{t('{name} stays on {score}.', { name, score })}</span>
      </span>
    </div>
  );
}

/** Everyone's score on the way to 5000; the player whose turn it is stands out. */
function Scoreboard({ g, players }: { g: Game; players: GameProps['players'] }) {
  const board = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLDivElement>(null);
  // Bring the player whose turn it is into view. Only the strip scrolls: scrollIntoView
  // would also move the whole page on iPhones.
  useEffect(() => {
    const strip = board.current;
    const chip = current.current;
    if (!strip || !chip) return;
    strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [g.current]);
  return (
    <div className="fk-board" ref={board}>
      {players.map((p, i) => (
        <div key={p.id} ref={i === g.current ? current : undefined} className={`fk-chip${i === g.current ? ' on' : ''}${g.opened[i] ? '' : ' out'}`}>
          <span className="fk-chip-top">
            <span className="bd-avatar xs" style={{ background: p.color }}>
              {p.avatar}
            </span>
            <span className="fk-chip-score">{fmt(g.scores[i])}</span>
          </span>
          <span className="fk-chip-name">{p.name}</span>
          <span className="fk-chip-bar">
            <i style={{ width: `${(g.scores[i] / TARGET) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Standings({ g, players }: { g: Game; players: GameProps['players'] }) {
  return (
    <section className="panel">
      <h3 className="section-title">{t('Final scores')}</h3>
      <div className="ftd-tally">
        {players
          .map((p, i) => ({ p, n: g.scores[i] }))
          .sort((a, b) => b.n - a.n)
          .map(({ p, n }) => (
            <div key={p.id} className="ftd-tally-row">
              <span className="bd-avatar xs" style={{ background: p.color }}>
                {p.avatar}
              </span>
              <span className="ftd-tally-name">{p.name}</span>
              <span className="ftd-tally-num">{fmt(n)}</span>
            </div>
          ))}
      </div>
    </section>
  );
}

interface Spot {
  x: number;
  y: number;
  rot: number;
}

/** Where the dice land: spread over the table without touching, each turned a little. */
/**
 * Where the dice land on a table of the given shape (height / width): spread out without
 * touching, each turned a little. x and y are percentages of the table's width and height.
 */
function scatter(n: number, aspect: number): Spot[] {
  // Work in units of 1% of the width; the die is as big as the CSS makes it (min(15cqw, 24cqh)).
  const h = 100 * aspect;
  const die = Math.min(15, 0.24 * h);
  const margin = die * 0.85;
  const spots: { x: number; y: number; rot: number }[] = [];
  for (let tries = 0; spots.length < n && tries < 600; tries++) {
    const s = { x: margin + Math.random() * (100 - 2 * margin), y: margin + Math.random() * (h - 2 * margin), rot: Math.random() * 60 - 30 };
    // The bottom-right corner is kept free for the bank button.
    const bank = Math.min(26, 0.36 * h) + 3;
    if (s.x > 100 - bank - die * 0.6 && s.y > h - bank - die * 0.6) continue;
    if (spots.every((o) => Math.hypot(o.x - s.x, o.y - s.y) > die * 1.45)) spots.push(s);
  }
  // Very unlucky? Fall back to a row.
  while (spots.length < n) spots.push({ x: 12 + spots.length * 19, y: h / 2, rot: 0 });
  return spots.map((s) => ({ x: s.x, y: (s.y / h) * 100, rot: s.rot }));
}

/** The table: the cup before a roll, the rolled dice after. Tap dice to set them aside. */
function Table({
  roll,
  picked,
  pickable,
  onTap,
  cup,
  shaking,
  dead,
  hint,
  onCup,
  bank,
}: {
  roll: Face[];
  picked: number[];
  pickable: (i: number) => boolean;
  onTap: (i: number) => void;
  cup: boolean;
  shaking: boolean;
  dead: boolean;
  hint: string | null;
  onCup: () => void;
  /** The stop-and-bank button in the table's corner (while picking). */
  bank: { text: string; amount: string; disabled: boolean; onClick: () => void } | null;
}) {
  const dice = useRef<HTMLDivElement>(null);
  // The table takes whatever room the screen has, so the dice are spread out once its shape is known.
  const [spots, setSpots] = useState<Spot[]>([]);
  useLayoutEffect(() => {
    const box = dice.current;
    if (box) setSpots(scatter(roll.length, box.offsetHeight / Math.max(1, box.offsetWidth)));
  }, [roll]);
  // Dice tumble out of the cup (in the middle) to where they land.
  useLayoutEffect(() => {
    const box = dice.current;
    if (!box || !roll.length || spots.length !== roll.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    box.querySelectorAll<HTMLElement>('.fk-die').forEach((el, i) => {
      const s = spots[i];
      const dx = ((50 - s.x) / 100) * w;
      const dy = ((55 - s.y) / 100) * h;
      el.animate(
        [
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${s.rot + 400}deg) scale(0.4)`, opacity: 0 },
          { opacity: 1, offset: 0.25 },
          { transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(1)` },
        ],
        { duration: 620, delay: i * 45, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.15)', fill: 'backwards' },
      );
    });
  }, [roll, spots]);

  return (
    <div className={`fk-table${dead ? ' dead' : ''}`} ref={dice}>
      {spots.length === roll.length &&
        roll.map((f, i) => (
        <button
          key={i}
          type="button"
          className={`fk-die${f >= 13 ? ' red' : ''}${picked.includes(i) ? ' picked' : ''}${!dead && !pickable(i) ? ' dull' : ''}`}
          style={{ left: `${spots[i].x}%`, top: `${spots[i].y}%`, '--rot': `${spots[i].rot}deg` } as CSSProperties}
          disabled={!pickable(i)}
          aria-pressed={picked.includes(i)}
          onClick={() => onTap(i)}
        >
          {t(FACE_LABEL[f])}
        </button>
      ))}
      {bank && (
        <Tap className="fk-bank" disabled={bank.disabled} onClick={bank.onClick} ariaLabel={`${bank.text} ${bank.amount}`}>
          <span className="fk-bank-icon" aria-hidden>
            💰
          </span>
          <span className="fk-bank-text">{bank.text}</span>
          <span className="fk-bank-amount">{bank.amount}</span>
        </Tap>
      )}
      {cup && (
        <button type="button" className={`fk-cup${shaking ? ' shaking' : ''}`} aria-label={t('Roll the dice')} onClick={onCup}>
          <svg viewBox="0 0 100 110" aria-hidden>
            <path className="fk-cup-body" d="M14 14h72l-9 88H23z" />
            <ellipse className="fk-cup-rim" cx="50" cy="14" rx="36" ry="9" />
            <ellipse className="fk-cup-hole" cx="50" cy="14" rx="29" ry="5.5" />
            <path className="fk-cup-stitch" d="M19 30h62M23 88h54" />
          </svg>
          {hint && <span className="fk-cup-hint">{hint}</span>}
        </button>
      )}
    </div>
  );
}
