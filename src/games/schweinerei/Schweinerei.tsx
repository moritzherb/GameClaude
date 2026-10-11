import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';
import Pig from './Pigs';
import { bank, loserSips, newGame, nextPlayer, play, TARGET, throwPigs, type Game, type Pose, type Throw } from './logic';

const POSE_NAME: Record<Pose, string> = {
  side: tx('Side'),
  'side-dot': tx('Side (dot)'),
  back: tx('Razorback'),
  standing: tx('Trotter'),
  snout: tx('Snouter'),
  jowl: tx('Leaning Jowler'),
};

const DOUBLE_NAME: Partial<Record<Pose, string>> = {
  back: tx('Double Razorback'),
  standing: tx('Double Trotter'),
  snout: tx('Double Snouter'),
  jowl: tx('Double Leaning Jowler'),
};

/** The name of a throw, e.g. "Double Snouter" or "Razorback + Snouter". */
function throwName(th: Throw): string {
  if (th.kind === 'pig-out') return t('Pig out!');
  if (th.kind === 'touch') return t('Schweinerei!');
  if (th.kind === 'piggyback') return t('Piggyback!');
  const [a, b] = th.pigs;
  if (th.points === 1) return t('Sider');
  if (th.double) return t(DOUBLE_NAME[a]!);
  const scoring = [a, b].filter((p) => p !== 'side' && p !== 'side-dot');
  return scoring.map((p) => t(POSE_NAME[p])).join(' + ');
}

export default function Schweinerei({ players, exit }: GameProps) {
  const known = useApp().knows('schweinerei');
  const [starterId, setStarterId] = useState(() => pick(players).id);
  const [g, setG] = useState<Game | null>(null);

  if (!g) {
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('Who starts?')}</h2>
          {!known && <p className="lead">{t('Then the pigs go round to the left. First to 100 wins.')}</p>}
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

  if (g.winner != null) return <Finish g={g} players={players} onAgain={() => setG(null)} exit={exit} />;
  return <Table g={g} setG={setG} players={players} known={known} />;
}

/** Where a pig lies on the table: in % of its width and height, turned by rot degrees. */
interface PigAt {
  x: number;
  y: number;
  rot: number;
}

/** At the start the pigs lie at the bottom, ready to be picked up. */
const HAND: [PigAt, PigAt] = [
  { x: 40, y: 80, rot: -10 },
  { x: 60, y: 81, rot: 12 },
];

/** The bank button sits in the bottom-right corner: pigs never land under it. */
const clampSpot = (x: number, y: number): [number, number] => {
  let cx = Math.min(77, Math.max(23, x));
  // Not under the slip with the result at the top.
  const cy = Math.min(80, Math.max(38, y));
  if (cx > 64 && cy > 64) cx = 64;
  return [cx, cy];
};

/** Where the pigs land: further the harder they were thrown, in the direction they flew. */
function landing(th: Throw, from: { x: number; y: number }, v: { x: number; y: number }, w: number, h: number): [PigAt, PigAt] {
  const speed = Math.hypot(v.x, v.y) || 1;
  // A harder throw goes further (and the pigs roll on a bit), never off the table.
  const dist = h * (0.18 + Math.min(speed, 3) * 0.1) * (0.85 + Math.random() * 0.3);
  const lx = ((from.x + (v.x / speed) * dist * 0.6) / w) * 100 + (Math.random() * 2 - 1) * 8;
  const ly = ((from.y + (v.y / speed) * dist) / h) * 100;
  const [x, y] = clampSpot(lx, ly);
  const j = () => Math.random() * 2 - 1;
  if (th.kind === 'touch') return [
    { x: x - 9, y, rot: -8 + j() * 10 },
    { x: x + 9, y: y + 1, rot: 172 + j() * 10 },
  ];
  if (th.kind === 'piggyback') return [
    { x, y: y + 4, rot: j() * 8 },
    { x: x + 2, y: y - 7, rot: -6 + j() * 8 },
  ];
  const a = clampSpot(x - 21 + j() * 5, y + j() * 8);
  const b = clampSpot(x + 21 + j() * 5, y + j() * 8);
  return [
    { x: a[0], y: a[1], rot: j() * 30 },
    { x: b[0], y: b[1], rot: j() * 30 },
  ];
}

const shownPoses = (th: Throw): [Pose, Pose] => (th.kind === 'score' || th.kind === 'pig-out' ? th.pigs : th.kind === 'touch' ? ['side-dot', 'side'] : ['back', 'standing']);

/** A throw in the air: where from, and the throw itself (decided when it leaves the hand). */
interface Flight {
  from: [{ x: number; y: number }, { x: number; y: number }];
  speed: number;
  th: Throw;
}

function Table({ g, setG, players, known }: { g: Game; setG: (g: Game) => void; players: GameProps['players']; known: boolean }) {
  const who = players[g.turn];
  const th = g.last;
  const table = useRef<HTMLDivElement>(null);
  const pigEls = useRef<(HTMLSpanElement | null)[]>([]);
  const [at, setAt] = useState<[PigAt, PigAt]>(HAND);
  const [poses, setPoses] = useState<[Pose, Pose]>(['side-dot', 'side']);
  const [mode, setMode] = useState<'rest' | 'held' | 'flying'>('rest');
  // Picked up and put down again without a real throw.
  const [dropped, setDropped] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const drag = useRef<{ id: number; samples: { x: number; y: number; t: number }[]; last: number } | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const canPick = !g.ended && mode === 'rest';
  const box = () => table.current!.getBoundingClientRect();

  /** Both pigs in the hand, at the finger (in px from the table's corner). */
  const holdAt = (x: number, y: number) => {
    const r = box();
    pigEls.current.forEach((el, i) => {
      if (!el) return;
      el.style.left = `${((x + (i ? 22 : -22)) / r.width) * 100}%`;
      el.style.top = `${((y + (i ? 6 : -4)) / r.height) * 100}%`;
    });
  };

  const pickUp = (e: React.PointerEvent) => {
    if (!canPick || !table.current) return;
    e.preventDefault();
    table.current.setPointerCapture(e.pointerId);
    const r = box();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    drag.current = { id: e.pointerId, samples: [{ x, y, t: e.timeStamp }], last: 0 };
    setMode('held');
    setDropped(false);
    holdAt(x, y);
    buzz(10);
    sfx.tick();
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r = box();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    d.samples.push({ x, y, t: e.timeStamp });
    if (d.samples.length > 12) d.samples.shift();
    holdAt(x, y);
    // A little rattle in the hand.
    if (e.timeStamp - d.last > 140) {
      d.last = e.timeStamp;
      buzz(4);
    }
  };

  const letGo = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const r = box();
    const end = d.samples[d.samples.length - 1];
    // Speed over the last moment before letting go (px per ms).
    const recent = d.samples.filter((p) => end.t - p.t <= 90);
    const first = recent[0];
    const dt = Math.max(1, end.t - first.t);
    const v = { x: (end.x - first.x) / dt, y: (end.y - first.y) / dt };
    const speed = Math.hypot(v.x, v.y);
    const here = (i: number): PigAt => ({ x: ((end.x + (i ? 22 : -22)) / r.width) * 100, y: ((end.y + (i ? 6 : -4)) / r.height) * 100, rot: at[i].rot });
    if (speed < 0.45 || v.y > 0.3) {
      // Not a throw: they're just put down where the finger let go.
      setAt([here(0), here(1)]);
      setMode('rest');
      setDropped(true);
      buzz([20, 30, 20]);
      return;
    }
    launch({ x: end.x, y: end.y }, v, speed);
  };

  /** Off they go: decide the throw, lay out where they land, and fly. */
  const launch = (from: { x: number; y: number }, v: { x: number; y: number }, speed: number) => {
    const r = box();
    const out = throwPigs();
    const land = landing(out, from, v, r.width, r.height);
    setFlight({
      from: [
        { x: from.x - 22, y: from.y - 4 },
        { x: from.x + 22, y: from.y + 6 },
      ],
      speed,
      th: out,
    });
    setAt(land);
    setMode('flying');
    sfx.pop();
    buzz(15);
  };

  /** Keyboard: Enter or Space throws them up the table. */
  const keyThrow = (e: React.KeyboardEvent) => {
    if (!canPick || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const r = box();
    launch({ x: r.width / 2, y: r.height * 0.8 }, { x: 0.1, y: -1.2 }, 1.2);
  };

  // Where the pigs lie, written straight to the page: while held they followed the finger
  // directly, so React's idea of where they are may be out of date.
  useLayoutEffect(() => {
    pigEls.current.forEach((el, i) => {
      if (!el) return;
      el.style.left = `${at[i].x}%`;
      el.style.top = `${at[i].y}%`;
    });
  }, [at, mode]);

  // The flight: from the hand up in an arc, tumbling, a little bounce, then lying still.
  useLayoutEffect(() => {
    if (!flight || !table.current) return;
    const r = box();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 1 : Math.min(1100, 700 + flight.speed * 120);
    pigEls.current.forEach((el, i) => {
      if (!el) return;
      const tx = (at[i].x / 100) * r.width;
      const ty = (at[i].y / 100) * r.height;
      const sx = flight.from[i].x - tx;
      const sy = flight.from[i].y - ty;
      const spin = (i ? 1 : -1) * (360 + Math.round(flight.speed * 300));
      const lift = Math.min(r.height * 0.35, 80 + flight.speed * 60);
      el.animate(
        [
          { transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px) rotate(${at[i].rot - spin}deg) scale(1.2)` },
          { transform: `translate(-50%, -50%) translate(${sx * 0.45}px, ${sy * 0.45 - lift}px) rotate(${at[i].rot - spin * 0.45}deg) scale(1.35)`, offset: 0.45 },
          { transform: `translate(-50%, -50%) rotate(${at[i].rot - 30 * (i ? 1 : -1)}deg) scale(1)`, offset: 0.78 },
          { transform: `translate(-50%, -50%) translateY(-14px) rotate(${at[i].rot - 8 * (i ? 1 : -1)}deg) scale(1.04)`, offset: 0.88 },
          { transform: `translate(-50%, -50%) rotate(${at[i].rot}deg) scale(1)` },
        ],
        { duration: dur, delay: i * 50, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'backwards' },
      );
    });
    // Landed: now they show how they lie, and the throw counts.
    timer.current = window.setTimeout(() => {
      const out = flight.th;
      setPoses(shownPoses(out));
      setMode('rest');
      setFlight(null);
      const next = play(g, out);
      setG(next);
      if (next.winner != null) celebrate();
      else if (out.kind === 'score') {
        if (out.double) sfx.tada();
        else sfx.pop();
        buzz(out.double ? [40, 40, 80] : 20);
      } else {
        sfx.boo();
        buzz([80, 40, 80]);
      }
    }, dur * 0.8);
    // Runs once per throw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  const doBank = () => {
    sfx.tada();
    buzz([30, 30, 60]);
    setG(bank(g));
  };

  const bad = th && th.kind !== 'score';
  const showResult = th && mode === 'rest';
  const hint =
    mode === 'held'
      ? t('And throw!')
      : mode === 'flying' || showResult
        ? null
        : dropped
          ? t('That wasn’t a throw. Swing up and let go!')
          : known
            ? t('Pick up the pigs and throw them')
            : t('Pick up the pigs, swing up and let go');

  return (
    <div className="mx fill sw">
      <div className="mx-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: who.color }}>
            {who.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{who.name}</span>
            <span className="bd-player-sub">{t('your turn')}</span>
          </span>
        </div>
        <div className="mx-claim" aria-live="polite">
          <span className="mx-claim-label">{t('In the pen: {n}', { n: g.scores[g.turn] })}</span>
          <span className="mx-claim-value">+{g.turnPts}</span>
        </div>
      </div>

      <div className="sw-board" aria-label={t('Scores')}>
        {players.map((p, i) => (
          <span key={p.id} className={`sw-score${i === g.turn ? ' on' : ''}`} style={{ '--who': p.color } as CSSProperties}>
            <span className="sw-score-avatar">{p.avatar}</span>
            <span className="sw-score-num">{g.scores[i]}</span>
          </span>
        ))}
      </div>

      <div
        className={`mx-table sw-table${mode === 'held' ? ' holding' : ''}`}
        ref={table}
        onPointerMove={move}
        onPointerUp={letGo}
        onPointerCancel={letGo}
      >
        {hint && (
          <span key={hint} className={`mx-hint${dropped ? ' warn' : ''}`}>
            {hint}
          </span>
        )}
        <span
          className={`sw-pigs${canPick ? ' ready' : ''}`}
          role="button"
          tabIndex={canPick ? 0 : -1}
          aria-label={t('Pick up the pigs and throw them')}
          aria-disabled={!canPick}
          onKeyDown={keyThrow}
        >
          {[0, 1].map((i) => (
            <span
              key={i}
              ref={(el) => {
                pigEls.current[i] = el;
              }}
              className={`sw-spot${mode === 'held' ? ' held' : ''}`}
              style={{ left: `${at[i].x}%`, top: `${at[i].y}%`, '--rot': `${at[i].rot}deg` } as CSSProperties}
              onPointerDown={pickUp}
            >
              <Pig pose={mode === 'rest' ? poses[i] : i ? 'side' : 'side-dot'} />
              {showResult && <span className="sw-pose">{t(POSE_NAME[poses[i]])}</span>}
            </span>
          ))}
        </span>
        {showResult && (
          <div className={`sw-result${bad ? ' bad' : th.kind === 'score' && th.double ? ' double' : ''}`} key={`${g.scores.join()}-${g.turnPts}-${g.turn}`} role="status">
            <span className="sw-result-name">{throwName(th)}</span>
            <span className="sw-result-sub">
              {th.kind === 'score'
                ? th.gives
                  ? t('+{n} · give out {s} sips', { n: th.points, s: th.gives })
                  : t('+{n}', { n: th.points })
                : th.kind === 'pig-out'
                  ? t('This turn’s points are gone. Drink 1.')
                  : th.kind === 'touch'
                    ? t('The pigs touch: all your points are gone. Drink 2.')
                    : t('One on top of the other: all your points are gone. Drink up!')}
            </span>
          </div>
        )}
        {!g.ended && g.turnPts > 0 && mode === 'rest' && (
          <Tap className="fk-bank sw-bank" onClick={doBank} ariaLabel={t('Into the pen: +{n}', { n: g.turnPts })}>
            <span className="fk-bank-icon" aria-hidden>
              🏠
            </span>
            <span className="fk-bank-text">{t('Pen')}</span>
            <span className="fk-bank-amount">+{g.turnPts}</span>
          </Tap>
        )}
      </div>

      <div className="sticky-action stack mx-actions sw-actions">
        {g.ended ? (
          <BigButton onClick={() => setG(nextPlayer(g))}>
            <NextName text={t('Next: {name} →')} name={players[(g.turn + 1) % players.length].name} />
          </BigButton>
        ) : (
          <span className="mx-slot mx-must">{g.turnPts > 0 ? t('Throw again, or put your points in the pen (bottom right)') : t('Grab the pigs and throw them up the table')}</span>
        )}
      </div>
    </div>
  );
}

function Finish({ g, players, onAgain, exit }: { g: Game; players: GameProps['players']; onAgain: () => void; exit: () => void }) {
  const winner = players[g.winner!];
  return (
    <div className="bd">
      <div className="bd-head center">
        <span className="kicker">{t('{n} points', { n: TARGET })}</span>
        <span className="sw-win-pigs" aria-hidden>
          <Pig pose="standing" />
          <Pig pose="jowl" />
        </span>
        <h2 className="bd-title big">{t('{name} wins!', { name: winner.name })}</h2>
        <p className="lead">{t('Everyone else drinks a sip for every 10 points they’re short.')}</p>
      </div>
      <section className="panel">
        <h3 className="section-title">{t('Drink up')}</h3>
        <div className="ftd-tally">
          {players
            .map((p, i) => ({ p, s: g.scores[i], i }))
            .filter(({ i }) => i !== g.winner)
            .sort((a, b) => a.s - b.s)
            .map(({ p, s }) => {
              const n = loserSips(s);
              return (
                <div key={p.id} className="ftd-tally-row">
                  <span className="bd-avatar xs" style={{ background: p.color }}>
                    {p.avatar}
                  </span>
                  <span className="ftd-tally-name">{p.name}</span>
                  <span className="sw-final">{s}</span>
                  <span className="ftd-tally-num">{n === 1 ? t('1 sip') : t('{n} sips', { n })}</span>
                </div>
              );
            })}
        </div>
      </section>
      <div className="sticky-action stack">
        <BigButton onClick={onAgain}>{t('Play again')}</BigButton>
        <BigButton variant="glass" onClick={exit}>
          {t('Back to games')}
        </BigButton>
      </div>
    </div>
  );
}
