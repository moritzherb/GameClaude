import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import Sheet from '../../components/Sheet';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useTurnBubble } from '../../lib/turn';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';
import Pig from './Pigs';
import { bank, BONUSES, loserSips, newGame, nextPlayer, play, TARGET, throwPigs, type Game, type Pose, type Throw } from './logic';
import Finished from '../../components/Finished';
import Avatar from '../../components/Avatar';

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

/** The name of a throw, e.g. "Double Snouter" or "Mixed double". */
function throwName(th: Throw): string {
  if (th.kind === 'pig-out') return t('Pig out!');
  if (th.kind === 'touch') return t('Makin’ Bacon!');
  if (th.kind === 'piggyback') return t('Piggyback!');
  if (th.points === 1) return t('Sider');
  if (th.double) return t(DOUBLE_NAME[th.pigs[0]]!);
  return t('Mixed double');
}

/** "3 × Razorback", "4 × Trotter/Razorback": a bonus target. */
function bonusLabel(target: number) {
  const b = BONUSES[target];
  const names = [...new Set(b.poses.map((p) => t(POSE_NAME[p === 'side-dot' ? 'side' : p])))];
  return `${b.count} × ${names.join('/')}`;
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
              <span className="pick-chip-avatar"><Avatar avatar={p.avatar} photo={p.photo} /></span>
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
  { x: 27, y: 78, rot: -10 },
  { x: 73, y: 79, rot: 12 },
];

/** How big a pig is on a table this size (px): its drawing is 34% of the table wide at most (.sw-spot). */
const pigSize = (w: number, h: number) => {
  const pw = Math.min(0.34 * w, 0.27 * h) * 0.9;
  return { pw, ph: pw * 0.75 };
};

/** Keep a pig on the table: not off the edges, not under the result slip at the top, not under the pen button. */
function clampSpot(x: number, y: number, w: number, pw: number): [number, number] {
  // The whole drawing (a little wider than the pig) stays on the table.
  const half = (pw / 0.9 / 2 / w) * 100 + 1;
  let cx = Math.min(100 - half, Math.max(half, x));
  const cy = Math.min(80, Math.max(40, y));
  if (cx > 62 && cy > 64) cx = 62;
  return [cx, cy];
}

/** Where the pigs land: further the harder they were thrown, in the direction they flew, apart unless they touch. */
function landing(th: Throw, from: { x: number; y: number }, v: { x: number; y: number }, w: number, h: number): [PigAt, PigAt] {
  const { pw, ph } = pigSize(w, h);
  const speed = Math.hypot(v.x, v.y) || 1;
  // A harder throw goes further (and the pigs roll on a bit), never off the table.
  const dist = h * (0.18 + Math.min(speed, 3) * 0.1) * (0.85 + Math.random() * 0.3);
  const lx = ((from.x + (v.x / speed) * dist * 0.6) / w) * 100 + (Math.random() * 2 - 1) * 8;
  const ly = ((from.y + (v.y / speed) * dist) / h) * 100;
  const [x, y] = clampSpot(lx, ly, w, pw);
  const j = () => Math.random() * 2 - 1;
  // Touching: snout to snout, overlapping a little. Piggyback: one on top of the other.
  if (th.kind === 'touch') {
    const off = ((pw * 0.42) / w) * 100;
    return [
      { x: x - off, y, rot: -6 + j() * 8 },
      { x: x + off, y: y + 1.5, rot: 174 + j() * 8 },
    ];
  }
  if (th.kind === 'piggyback') return [
    { x, y: y + 3, rot: j() * 8 },
    { x: x + 3, y: y - ((ph * 0.35) / h) * 100, rot: -6 + j() * 8 },
  ];
  // Otherwise they never overlap: try spots round the landing point until the two lie apart.
  // A pig tipped onto its snout sticks its legs out sideways: it needs more room.
  const tipped = (th.kind === 'score' || th.kind === 'pig-out') && th.pigs.some((p) => p === 'snout' || p === 'jowl');
  const room = tipped ? 1.25 : 1;
  for (let i = 0; i < 40; i++) {
    const sideBySide = Math.random() < 0.65;
    const dx = sideBySide ? pw * room + 12 + Math.random() * 40 : Math.random() * pw * 0.6;
    const dy = sideBySide ? j() * ph * 0.4 : ph * room + 12 + Math.random() * 30;
    const sx = Math.random() < 0.5 ? 1 : -1;
    const ax = clampSpot(x - ((sx * dx) / 2 / w) * 100, y - (dy / 2 / h) * 100, w, pw);
    const bx = clampSpot(x + ((sx * dx) / 2 / w) * 100, y + (dy / 2 / h) * 100, w, pw);
    const apartX = (Math.abs(ax[0] - bx[0]) / 100) * w >= pw * room * 0.98;
    const apartY = (Math.abs(ax[1] - bx[1]) / 100) * h >= ph * room * 0.98;
    if (apartX || apartY)
      return [
        { x: ax[0], y: ax[1], rot: j() * 25 },
        { x: bx[0], y: bx[1], rot: j() * 25 },
      ];
  }
  // A tight table: one top left, one bottom right.
  const a = clampSpot(0, 40, w, pw);
  const b2 = clampSpot(100, 40 + ((ph + 10) / h) * 100, w, pw);
  return [
    { x: a[0], y: a[1], rot: j() * 20 },
    { x: Math.min(b2[0], 62), y: b2[1], rot: j() * 20 },
  ];
}

/** The "throw again" arrow: most of a circle, its head at the top right, turning clockwise. */
const AGAIN_ARC = 'M69.3 29.8A28 28 0 1 0 78 50';
const AGAIN_HEAD = 'M76.5 36.8 62.3 34.2 73.5 22.6Z';

const shownPoses = (th: Throw): [Pose, Pose] => (th.kind === 'score' || th.kind === 'pig-out' ? th.pigs : th.kind === 'touch' ? ['side-dot', 'side'] : ['back', 'standing']);

/** A throw in the air: where from, and the throw itself (decided when it leaves the hand). */
interface Flight {
  from: [{ x: number; y: number }, { x: number; y: number }];
  speed: number;
  th: Throw;
}

function Table({ g, setG, players, known }: { g: Game; setG: (g: Game) => void; players: GameProps['players']; known: boolean }) {
  const who = players[g.turn];
  useTurnBubble(who);
  const th = g.last;
  const table = useRef<HTMLDivElement>(null);
  const pigEls = useRef<(HTMLSpanElement | null)[]>([]);
  const [at, setAt] = useState<[PigAt, PigAt]>(HAND);
  const [poses, setPoses] = useState<[Pose, Pose]>(['side-dot', 'side']);
  const [mode, setMode] = useState<'rest' | 'held' | 'flying'>('rest');
  // Picked up and put down again without a real throw.
  const [dropped, setDropped] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [bonusInfo, setBonusInfo] = useState(false);
  // With many players the row of points scrolls: keep whoever's turn it is in view.
  const board = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = board.current;
    const chip = row?.children[g.turn] as HTMLElement | undefined;
    if (!row || !chip) return;
    if (chip.offsetLeft < row.scrollLeft || chip.offsetLeft + chip.offsetWidth > row.scrollLeft + row.clientWidth)
      row.scrollTo({ left: chip.offsetLeft - 6, behavior: 'smooth' });
  }, [g.turn]);
  // The bonus names its target only when that fits next to everyone's points; otherwise it shows
  // just how far and how much (tap it for the rest), and the points keep their room.
  const bonusEl = useRef<HTMLButtonElement>(null);
  const bonusWhat = useRef<HTMLSpanElement>(null);
  const [bonusTight, setBonusTight] = useState(false);
  useLayoutEffect(() => {
    const fit = () => {
      const row = board.current;
      const pill = bonusEl.current;
      const what = bonusWhat.current;
      const last = row?.lastElementChild as HTMLElement | null;
      if (!row || !pill || !what || !last) return;
      const GAP = 6;
      // The pill without its name (the same whether the name shows or not), and what the name needs.
      const rest = pill.offsetWidth - what.offsetWidth - (bonusTight ? 0 : GAP);
      const room = row.parentElement!.clientWidth - GAP - (last.offsetLeft + last.offsetWidth) - rest;
      setBonusTight(room < what.scrollWidth + GAP);
    };
    fit();
    const watch = new ResizeObserver(fit);
    if (board.current?.parentElement) watch.observe(board.current.parentElement);
    return () => watch.disconnect();
  });
  /** A finger holding the pigs: where it has been, and what's needed to move them without asking the page for layout. */
  const drag = useRef<{
    id: number;
    samples: { x: number; y: number; t: number }[];
    last: number;
    rect: DOMRect;
    /** Where each pig lies (px), so the hand moves them with a transform only. */
    base: { x: number; y: number }[];
    frame: number;
    x: number;
    y: number;
  } | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const canPick = !g.ended && mode === 'rest';
  const box = () => table.current!.getBoundingClientRect();

  /** Both pigs in the hand, at the finger (px from the table's corner): moved once per frame, by transform only. */
  const holdAt = (x: number, y: number) => {
    const d = drag.current;
    if (!d) return;
    d.x = x;
    d.y = y;
    if (d.frame) return;
    d.frame = requestAnimationFrame(() => {
      d.frame = 0;
      pigEls.current.forEach((el, i) => {
        if (!el) return;
        const dx = d.x + (i ? 22 : -22) - d.base[i].x;
        const dy = d.y + (i ? 6 : -4) - d.base[i].y;
        el.style.transform = `translate(-50%, -50%) translate3d(${dx}px, ${dy}px, 0) rotate(${at[i].rot}deg) scale(1.22)`;
      });
    });
  };

  const pickUp = (e: React.PointerEvent) => {
    if (!canPick || !table.current) return;
    e.preventDefault();
    table.current.setPointerCapture(e.pointerId);
    const r = box();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    drag.current = {
      id: e.pointerId,
      samples: [{ x, y, t: e.timeStamp }],
      last: 0,
      rect: r,
      base: at.map((a) => ({ x: (a.x / 100) * r.width, y: (a.y / 100) * r.height })),
      frame: 0,
      x,
      y,
    };
    setMode('held');
    setDropped(false);
    holdAt(x, y);
    buzz(10);
    sfx.tick();
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const x = e.clientX - d.rect.left;
    const y = e.clientY - d.rect.top;
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
    cancelAnimationFrame(d.frame);
    const r = d.rect;
    const end = d.samples[d.samples.length - 1];
    // Speed over the last moment before letting go (px per ms).
    const recent = d.samples.filter((p) => end.t - p.t <= 90);
    const first = recent[0];
    const dt = Math.max(1, end.t - first.t);
    const v = { x: (end.x - first.x) / dt, y: (end.y - first.y) / dt };
    const speed = Math.hypot(v.x, v.y);
    // Put down side by side where the finger let go (not on top of each other, even at an edge).
    const { pw } = pigSize(r.width, r.height);
    const gap = ((pw * 1.06) / r.width) * 100;
    const ey = (end.y / r.height) * 100;
    let a = clampSpot((end.x / r.width) * 100 - gap / 2, ey, r.width, pw);
    const b = clampSpot(a[0] + gap, ey, r.width, pw);
    if (b[0] - a[0] < gap * 0.98) a = clampSpot(b[0] - gap, ey, r.width, pw);
    const here = (i: number): PigAt => {
      const [x, y] = i ? b : a;
      return { x, y, rot: at[i].rot };
    };
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
    // They land the way the throw fell: under the tumbling pig, that picture fades in as it rolls out.
    setPoses(shownPoses(out));
    setMode('flying');
    setDropped(false);
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

  // Where the pigs lie. While held they follow the finger by an inline transform: once they're
  // put down or thrown, that goes and they lie where the state says.
  useLayoutEffect(() => {
    pigEls.current.forEach((el, i) => {
      if (!el) return;
      el.style.left = `${at[i].x}%`;
      el.style.top = `${at[i].y}%`;
      if (mode !== 'held') el.style.transform = '';
    });
  }, [at, mode]);

  // The flight: up from the hand in an arc, tumbling, down onto the table, a little bounce,
  // then rolling on in the same direction and slowing down until it lies still.
  useLayoutEffect(() => {
    if (!flight || !table.current) return;
    const r = box();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 1 : Math.min(1500, 1050 + flight.speed * 120);
    const { pw } = pigSize(r.width, r.height);
    pigEls.current.forEach((el, i) => {
      if (!el) return;
      const tx = (at[i].x / 100) * r.width;
      const ty = (at[i].y / 100) * r.height;
      const sx = flight.from[i].x - tx;
      const sy = flight.from[i].y - ty;
      // Where it first touches the table: a little short of where it ends up, along its way.
      const len = Math.hypot(sx, sy) || 1;
      const roll = Math.min(pw * 0.55, 30 + flight.speed * 18);
      const lx = (sx / len) * roll;
      const ly = (sy / len) * roll;
      const dir = i ? 1 : -1;
      const spin = dir * (360 + Math.round(flight.speed * 260));
      // Rolling over the table turns it on: about a quarter turn per half a pig.
      const rollTurn = dir * Math.round((roll / (pw * 0.5)) * 90);
      const lift = Math.min(r.height * 0.32, 70 + flight.speed * 55);
      const rot = at[i].rot;
      el.animate(
        [
          { transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px) rotate(${rot - spin}deg) scale(1.2)`, easing: 'cubic-bezier(0.3, 0.7, 0.6, 1)' },
          { transform: `translate(-50%, -50%) translate(${(sx + lx) / 2}px, ${(sy + ly) / 2 - lift}px) rotate(${rot - rollTurn - spin * 0.4}deg) scale(1.32)`, offset: 0.36, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
          { transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px) rotate(${rot - rollTurn}deg) scale(1)`, offset: 0.58, easing: 'ease-out' },
          { transform: `translate(-50%, -50%) translate(${lx * 0.7}px, ${ly * 0.7 - 12}px) rotate(${rot - rollTurn * 0.7}deg) scale(1.03)`, offset: 0.66, easing: 'cubic-bezier(0.2, 0.6, 0.25, 1)' },
          { transform: `translate(-50%, -50%) rotate(${rot}deg) scale(1)` },
        ],
        { duration: dur, delay: i * 60, fill: 'backwards' },
      );
      // From the tumbling pig to the way it lies: as it touches down it rolls over, the tumbling
      // pig turning away edge-on and the lying one turning up out of it, each squashed along the
      // axis it rolls over, so the two never stand on top of each other as two different pigs.
      const fade = { duration: dur, delay: i * 60, fill: 'both' as const };
      el.querySelector('.sw-air')?.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 1, transform: 'none', offset: 0.5, easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)' },
          { opacity: 0.6, transform: 'scaleY(0.08)', offset: 0.62 },
          { opacity: 0, transform: 'scaleY(0.08)', offset: 0.63 },
          { opacity: 0, transform: 'scaleY(0.08)' },
        ],
        fade,
      );
      el.querySelector('.sw-final')?.animate(
        [
          { opacity: 0, transform: 'scaleY(0.08)' },
          { opacity: 0, transform: 'scaleY(0.08)', offset: 0.6 },
          { opacity: 1, transform: 'scaleY(0.08)', offset: 0.61, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' },
          { opacity: 1, transform: 'none', offset: 0.76 },
          { opacity: 1, transform: 'none' },
        ],
        fade,
      );
    });
    // Lying still: the throw counts.
    timer.current = window.setTimeout(() => {
      const out = flight.th;
      setMode('rest');
      setFlight(null);
      const next = play(g, out);
      setG(next);
      if (next.winner != null) celebrate();
      else if (out.kind === 'score') {
        if (out.double || next.bonusNow) sfx.tada();
        else sfx.pop();
        buzz(out.double || next.bonusNow ? [40, 40, 80] : 20);
      } else if (next.freeThrow) {
        sfx.tick();
        buzz(20);
      } else {
        sfx.boo();
        buzz([80, 40, 80]);
      }
    }, dur + 80);
    // Runs once per throw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  const doBank = () => {
    sfx.tada();
    buzz([30, 30, 60]);
    setG(bank(g));
  };

  // A pig out on the turn's first throw costs nothing: no cross, no red.
  const bad = th && th.kind !== 'score' && !g.freeThrow;
  // Not after picking them up and putting them down again: that throw is over.
  const showResult = th && mode === 'rest' && !dropped;
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
            <Avatar avatar={who.avatar} photo={who.photo} />
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

      <div className="sw-board">
        {/* Everyone's points (scrolls sideways when there are many), the bonus throw always in view. */}
        <div className="sw-board-players" ref={board} aria-label={t('Scores')}>
          {players.map((p, i) => (
            <span key={p.id} className={`sw-score${i === g.turn ? ' on' : ''}`} style={{ '--who': p.color } as CSSProperties}>
              <span className="sw-score-avatar"><Avatar avatar={p.avatar} photo={p.photo} /></span>
              <span className="sw-score-num">{g.scores[i]}</span>
            </span>
          ))}
        </div>
        <button
          type="button"
          ref={bonusEl}
          className={`sw-bonus${g.bonus.won ? ' won' : ''}${bonusTight ? ' tight' : ''}`}
          key={`bonus-${g.turn}-${g.bonus.target}`}
          aria-label={t('Bonus throw: {what} for +{n}', { what: bonusLabel(g.bonus.target), n: BONUSES[g.bonus.target].points })}
          onClick={() => setBonusInfo(true)}
        >
          <span aria-hidden>🎯</span>
          <span className="sw-bonus-what" ref={bonusWhat}>
            {bonusLabel(g.bonus.target)}
          </span>
          <span className="sw-bonus-pts">{g.bonus.won ? '✓' : `${Math.min(g.bonus.count, BONUSES[g.bonus.target].count)}/${BONUSES[g.bonus.target].count}`}</span>
          <span className="sw-bonus-plus">+{BONUSES[g.bonus.target].points}</span>
        </button>
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
              <span className="sw-wiggle">
                <Pig pose={poses[i]} className={mode === 'flying' ? 'sw-final' : ''} />
                {mode === 'flying' && <Pig pose={i ? 'side' : 'side-dot'} className="sw-air" />}
              </span>
              {/* Whoever knows the game sees how they lie: no names under the pigs. */}
              {showResult && !known && <span className="sw-pose">{t(POSE_NAME[poses[i]])}</span>}
            </span>
          ))}
        </span>
        {/* Over the pigs, so nobody misses it: a red cross when the turn is lost, a yellow
            "again" arrow when a pig out on the first throw lets the player throw once more. */}
        {showResult && (bad || g.freeThrow) && (
          <svg
            className={`sw-mark ${bad ? 'sw-lost' : 'sw-again'}`}
            viewBox="0 0 100 100"
            aria-hidden
            key={`x-${g.scores.join()}-${g.turnPts}-${g.turn}-${g.ended}-${g.freeThrow}`}
            style={{ '--x': `calc(${(at[0].x + at[1].x) / 2} * var(--qw))`, '--y': `calc(${(at[0].y + at[1].y) / 2} * var(--qh))` } as CSSProperties}
          >
            {bad ? (
              <>
                <path d="M22 22 78 78M78 22 22 78" className="sw-mark-edge" />
                <path d="M22 22 78 78M78 22 22 78" className="sw-mark-bar" />
              </>
            ) : (
              <>
                <path d={AGAIN_ARC} className="sw-mark-edge" />
                <path d={AGAIN_HEAD} className="sw-mark-head-edge" />
                <path d={AGAIN_ARC} className="sw-mark-bar" />
                <path d={AGAIN_HEAD} className="sw-mark-head" />
              </>
            )}
          </svg>
        )}
        {showResult && (
          <div className={`sw-result${bad ? ' bad' : g.freeThrow ? ' again' : th.kind === 'score' && th.double ? ' double' : ''}`} key={`${g.scores.join()}-${g.turnPts}-${g.turn}-${g.ended}-${g.freeThrow}`} role="status">
            <span className="sw-result-name">{throwName(th)}</span>
            {g.bonusNow && <span className="sw-result-bonus">{t('Bonus throw! {what}: +{n}', { what: bonusLabel(g.bonus.target), n: BONUSES[g.bonus.target].points })}</span>}
            <span className="sw-result-sub">
              {th.kind === 'score'
                ? th.gives
                  ? t('+{n} · give out {s} sips', { n: th.points, s: th.gives })
                  : t('+{n}', { n: th.points })
                : th.kind === 'pig-out'
                  ? g.freeThrow
                    ? t('First throw: 0 points, throw again.')
                    : t('This turn’s points are gone. Drink 1.')
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

      <Sheet open={bonusInfo} onClose={() => setBonusInfo(false)} title={t('Bonus throw')}>
        <p className="lead">
          {t('Get {what} within this turn: every pig counts, over all your throws until you put the points in the pen. Then +{n} points on top, once. Every turn has a new target.', {
            what: bonusLabel(g.bonus.target),
            n: BONUSES[g.bonus.target].points,
          })}
        </p>
        <p className="fine-print">{t('So far this turn: {count} of {target}.', { count: Math.min(g.bonus.count, BONUSES[g.bonus.target].count), target: BONUSES[g.bonus.target].count })}</p>
      </Sheet>
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
                    <Avatar avatar={p.avatar} photo={p.photo} />
                  </span>
                  <span className="ftd-tally-name">{p.name}</span>
                  <span className="sw-final">{s}</span>
                  <span className="ftd-tally-num">{n === 1 ? t('1 sip') : t('{n} sips', { n })}</span>
                </div>
              );
            })}
        </div>
      </section>
      <Finished game="schweinerei" />
      <div className="sticky-action stack">
        <BigButton onClick={onAgain}>{t('Play again')}</BigButton>
        <BigButton variant="glass" onClick={exit}>
          {t('Back to games')}
        </BigButton>
      </div>
    </div>
  );
}
