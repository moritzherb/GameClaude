import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Finished from '../../components/Finished';
import { t, tx } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { load, save } from '../../lib/storage';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import {
  canGrow,
  canMove,
  dailyRolls,
  flaps,
  isMove,
  LIVES,
  loseLives,
  MODES,
  oneDieAllowed,
  ranking,
  rollDie,
  score,
  sum,
  TIME_LIMIT,
  today,
  type BoardSize,
  type Level,
  type Mode,
} from './logic';
import FeltDice, { THROW_MS } from './FeltDice';
import { woodVars } from './wood';

interface Setup {
  mode: Mode;
  size: BoardSize;
  level: Level;
  rounds: 5 | 10;
}

const MODE_INFO: Record<Mode, { name: string; text: string; icon: string }> = {
  classic: { name: tx('Classic'), text: tx('Everyone plays one box a round. Lowest score wins the round, highest drinks 2.'), icon: '🎲' },
  tournament: { name: tx('Tournament'), text: tx('Scores add up over the rounds. Lowest total wins; highest total drinks 3 at the end.'), icon: '🏆' },
  survival: { name: tx('Survival'), text: tx('3 lives each. The highest score of a round loses one and drinks 1. Last one standing wins.'), icon: '❤️' },
  daily: { name: tx('Daily challenge'), text: tx('Today’s dice, the same for everyone who plays today. One box each: beat the others, and your best.'), icon: '📅' },
  time: { name: tx('Time attack'), text: tx('45 seconds for your whole box. Whatever is still open when time runs out counts.'), icon: '⏱️' },
};

/** One player's box this round. */
interface Box {
  open: number[];
  dice: number[] | null;
  rolling: boolean;
  picked: number[];
  /** Rolls so far (the daily dice go by it). */
  rolls: number;
  /** Over: no move left, all shut, or out of time. */
  over: boolean;
  /** Time attack: when the clock started (the first roll). */
  started: number | null;
}

const freshBox = (size: BoardSize): Box => ({ open: flaps(size), dice: null, rolling: false, picked: [], rolls: 0, over: false, started: null });

interface Match {
  setup: Setup;
  round: number;
  /** Who plays this round, in order (survival: the ones still in). */
  order: string[];
  turn: number;
  box: Box;
  /** Each round's scores, per player. */
  scores: Record<string, number>[];
  lives: Record<string, number>;
  /** Between turns, after the round, after the game. */
  phase: 'turn' | 'handover' | 'round' | 'over';
}

const ROLL_MS = THROW_MS + 60;
/** A flap falling into the box, and the next one after it (ms). */
const FALL_MS = 640;
const STAGGER = 90;

export default function NumberFlip({ players }: GameProps) {
  const known = useApp().knows('number-flip');
  const [setup, setSetup] = useState<Setup>(() => load<Setup>('number-flip-setup', { mode: 'classic', size: 9, level: 'normal', rounds: 5 }));
  const [m, setM] = useState<Match | null>(null);
  const byId = (id: string) => players.find((p) => p.id === id)!;
  const solo = players.length < 2;

  const start = (s: Setup) => {
    save('number-flip-setup', s);
    setM({
      setup: s,
      round: 1,
      order: players.map((p) => p.id),
      turn: 0,
      box: freshBox(s.size),
      scores: [{}],
      lives: Object.fromEntries(players.map((p) => [p.id, LIVES])),
      phase: 'turn',
    });
  };

  if (!m) return <SetupScreen setup={setup} onChange={setSetup} solo={solo} onStart={start} />;
  return <Play m={m} setM={setM} players={players} byId={byId} known={known} onSetup={() => setM(null)} />;
}

/* ---------- Before the game ---------- */

function SetupScreen({ setup, onChange, solo, onStart }: { setup: Setup; onChange: (s: Setup) => void; solo: boolean; onStart: (s: Setup) => void }) {
  const set = (patch: Partial<Setup>) => {
    sfx.tick();
    buzz(8);
    onChange({ ...setup, ...patch });
  };
  const mode = solo && setup.mode === 'survival' ? 'classic' : setup.mode;
  // The box's wood takes a moment to draw: done while the setup shows, not when the game starts.
  useEffect(() => {
    const id = window.setTimeout(woodVars, 120);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="bd nf-setup">
      <section className="section">
        <h3 className="section-title">{t('Mode')}</h3>
        <div className="nf-modes" role="radiogroup" aria-label={t('Mode')}>
          {MODES.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              className={`nf-mode${mode === id ? ' on' : ''}`}
              disabled={solo && id === 'survival'}
              onClick={() => set({ mode: id })}
            >
              <span className="nf-mode-icon" aria-hidden>
                {MODE_INFO[id].icon}
              </span>
              <span className="nf-mode-name">{t(MODE_INFO[id].name)}</span>
            </button>
          ))}
        </div>
        <p className="nf-mode-text">{solo && setup.mode === 'survival' ? t('Survival needs 2 or more players.') : t(MODE_INFO[mode].text)}</p>
      </section>

      <section className="panel nf-opts">
        {mode === 'tournament' && <Choice label={t('Rounds')} options={[5, 10] as const} value={setup.rounds} name={(n) => String(n)} onPick={(n) => set({ rounds: n })} />}
        <Choice label={t('Box')} options={[9, 12] as const} value={setup.size} name={(n) => `1–${n}`} onPick={(n) => set({ size: n })} />
        <Choice label={t('Level')} options={['normal', 'hard'] as const} value={setup.level} name={(l) => (l === 'hard' ? t('Hard') : t('Normal'))} onPick={(l) => set({ level: l })} />
        <p className="nf-opt-note">{setup.level === 'hard' ? t('Hard: only the total, or the two dice themselves.') : t('Normal: any open flaps that add up.')}</p>
      </section>

      <div className="sticky-action">
        <BigButton size="xl" onClick={() => onStart({ ...setup, mode })}>
          {t('Let’s go')}
        </BigButton>
      </div>
    </div>
  );
}

/** One setting: its name, then its choices as pills. */
function Choice<T extends string | number>({ label, options, value, name, onPick }: { label: string; options: readonly T[]; value: T; name: (v: T) => string; onPick: (v: T) => void }) {
  return (
    <div className="nf-opt" role="radiogroup" aria-label={label}>
      <span className="nf-opt-label">{label}</span>
      {options.map((o) => (
        <button key={String(o)} type="button" role="radio" aria-checked={value === o} className={`nf-pill${value === o ? ' on' : ''}`} onClick={() => onPick(o)}>
          {name(o)}
        </button>
      ))}
    </div>
  );
}

/* ---------- The game ---------- */

interface PlayProps {
  m: Match;
  setM: (m: Match | ((m: Match | null) => Match | null)) => void;
  players: Player[];
  byId: (id: string) => Player;
  known: boolean;
  onSetup: () => void;
}

function Play({ m, setM, players, byId, known, onSetup }: PlayProps) {
  const { setup, box } = m;
  const mRef = useRef(m);
  mRef.current = m;
  const who = byId(m.order[m.turn]);
  const daily = useMemo(() => (setup.mode === 'daily' ? dailyRolls(today(), setup.size) : null), [setup.mode, setup.size]);
  const [oneDie, setOneDie] = useState(false);
  const [nope, setNope] = useState<number | null>(null);
  /** The flaps falling right now, in the order they go. */
  const [falling, setFalling] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const update = (fn: (x: Match) => Match) => setM((x) => (x ? fn(x) : x));
  const setBox = (b: Partial<Box>) => update((x) => ({ ...x, box: { ...x.box, ...b } }));

  /** The turn is over: its score counts; on to the next player, or the round's end. */
  const endTurn = (x: Match): Match => {
    const id = x.order[x.turn];
    const scores = [...x.scores];
    scores[x.round - 1] = { ...scores[x.round - 1], [id]: score(x.box.open) };
    const last = x.turn === x.order.length - 1;
    return { ...x, scores, box: { ...x.box, over: true }, phase: last ? 'round' : 'handover' };
  };

  // Time attack: the clock runs from the first roll; at 0 the box closes as it is.
  const timed = setup.mode === 'time' && m.phase === 'turn' && !box.over && box.started != null;
  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timed]);
  const left = box.started != null ? Math.max(0, TIME_LIMIT - (now - box.started) / 1000) : TIME_LIMIT;
  useEffect(() => {
    if (timed && left <= 0 && !box.rolling) {
      buzz([60, 40, 60]);
      update(endTurn);
    }
  });

  const roll = () => {
    if (m.phase !== 'turn' || box.rolling || box.over || box.dice) return;
    const one = oneDie && oneDieAllowed(box.open);
    const pair = daily ? daily[box.rolls % daily.length] : [rollDie(), rollDie()];
    const dice = one ? [pair[0]] : pair;
    sfx.tick();
    buzz(15);
    setBox({ dice, rolling: true, picked: [], rolls: box.rolls + 1, started: box.started ?? Date.now() });
    window.setTimeout(() => {
      sfx.pop();
      buzz(20);
      update((x) => {
        const b = { ...x.box, rolling: false };
        const next = { ...x, box: b };
        return canMove(b.open, dice, setup.level) ? next : endTurn(next);
      });
    }, ROLL_MS);
  };

  const tap = (n: number) => {
    if (m.phase !== 'turn' || box.over || box.rolling || !box.dice || falling.length || !box.open.includes(n)) return;
    const dice = box.dice;
    if (box.picked.includes(n)) {
      sfx.tick();
      setBox({ picked: box.picked.filter((k) => k !== n) });
      return;
    }
    const pick = [...box.picked, n];
    if (!canGrow(box.open, dice, setup.level, pick)) {
      buzz([20, 30, 20]);
      setNope(n);
      window.setTimeout(() => setNope(null), 320);
      return;
    }
    sfx.tick();
    buzz(10);
    setBox({ picked: pick });
  };

  /** The picked flaps go down, one after the other; then roll again (or the box is shut). */
  const flipDown = () => {
    if (m.phase !== 'turn' || box.over || box.rolling || !box.dice || falling.length || !isMove(box.open, box.dice, setup.level, box.picked)) return;
    const order = [...box.picked].sort((a, b) => a - b);
    const open = box.open.filter((k) => !order.includes(k));
    setFalling(order);
    setBox({ open, picked: [] });
    // Each one lands with a knock.
    order.forEach((_, i) =>
      window.setTimeout(() => {
        sfx.tick();
        buzz(14);
      }, FALL_MS * 0.55 + STAGGER * i),
    );
    window.setTimeout(() => {
      setFalling([]);
      setOneDie((one) => oneDieAllowed(open) && one);
      if (open.length === 0) {
        celebrate();
        update((x) => endTurn({ ...x, box: { ...x.box, dice: null } }));
      } else setBox({ dice: null });
    }, FALL_MS + STAGGER * (order.length - 1) + 60);
  };

  const nextTurn = () => {
    setOneDie(false);
    update((x) => ({ ...x, turn: x.turn + 1, box: freshBox(setup.size), phase: 'turn' }));
  };

  const scores = m.scores[m.round - 1] ?? {};
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of m.scores) for (const [id, s] of Object.entries(r)) out[id] = (out[id] ?? 0) + s;
    return out;
  }, [m.scores]);

  /* ---------- The round's end ---------- */
  if (m.phase === 'round' || m.phase === 'over') {
    return <RoundEnd {...{ m, setM, players, byId, scores, totals, onSetup }} />;
  }

  const stat = (p: Player) => {
    if (setup.mode === 'survival') return '❤️'.repeat(m.lives[p.id] ?? 0) || '—';
    if (setup.mode === 'tournament') return t('{n} pts', { n: totals[p.id] ?? 0 });
    return scores[p.id] == null ? '' : scores[p.id] === 0 ? t('Shut!') : t('{n} left', { n: scores[p.id] });
  };

  const dice = box.dice;
  const total = dice ? sum(dice) : 0;
  const mayOne = oneDieAllowed(box.open) && !dice && !box.over && !falling.length;
  const ready = !!dice && !box.rolling && !falling.length && isMove(box.open, dice, setup.level, box.picked);
  const hint = box.over
    ? box.open.length === 0
      ? t('Box shut! Perfect.')
      : t('No move left: {n} stays open', { n: score(box.open) })
    : box.rolling || known
      ? ''
      : dice
        ? setup.level === 'hard'
          ? dice.length === 2 && dice[0] !== dice[1]
            ? t('Flip {n}, or {a} and {b}', { n: total, a: dice[0], b: dice[1] })
            : t('Flip {n}', { n: total })
          : box.picked.length
            ? t('{n} more', { n: total - sum(box.picked) })
            : t('Flip flaps that add up to {n}', { n: total })
        : box.rolls === 0
          ? t('Roll, then flip flaps that add up to the dice')
          : t('{n} still open', { n: score(box.open) });

  return (
    <div className="bd nf-play">
      <TurnTitle {...{ m, who, setup }} />
      <div className="nf-players" aria-label={t('Players')}>
        {m.order.map((id, i) => {
          const p = byId(id);
          return (
            <div key={id} className={`nf-chip${i === m.turn ? ' on' : ''}${scores[id] != null ? ' done' : ''}`} style={{ '--p': p.color } as CSSProperties}>
              <span className="bd-avatar xs" style={{ background: p.color }}>
                <Avatar avatar={p.avatar} photo={p.photo} />
              </span>
              <span className="nf-chip-name">{p.name}</span>
              <span className="nf-chip-stat">{stat(p)}</span>
            </div>
          );
        })}
      </div>

      <div className={`nf-box size-${setup.size}`} style={woodVars() as CSSProperties}>
        {(setup.size === 12 ? [flaps(12).slice(0, 6), flaps(12).slice(6)] : [flaps(9)]).map((row) => (
          <div key={row[0]} className="nf-flaps">
            {row.map((n) => {
              const down = !box.open.includes(n);
              const picked = box.picked.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={`nf-flap${down ? ' down' : ''}${picked ? ' picked' : ''}${nope === n ? ' nope' : ''}`}
                  style={{ '--gx': `${-((n * 67) % 300)}px`, '--d': `${Math.max(0, falling.indexOf(n)) * STAGGER}ms` } as CSSProperties}
                  aria-label={down ? t('{n}, flipped', { n }) : String(n)}
                  aria-pressed={picked}
                  disabled={down || !dice || box.rolling || box.over || falling.length > 0}
                  onClick={() => tap(n)}
                >
                  {/* A block of wood: its face with the number, its back, its top and its sides. */}
                  <span className="nf-block" aria-hidden>
                    <span className="nf-side front">
                      <span className="nf-flap-face">{n}</span>
                    </span>
                    <span className="nf-side back" />
                    <span className="nf-side top" />
                    <span className="nf-side left" />
                    <span className="nf-side right" />
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        <div className="nf-felt">
          {setup.mode === 'time' && (
            <div className="nf-clock" aria-label={t('{n} seconds left', { n: Math.ceil(left) })}>
              <span className="nf-clock-bar" style={{ transform: `scaleX(${left / TIME_LIMIT})` }} />
              <span className="nf-clock-n">{Math.ceil(left)}</span>
            </div>
          )}
          <FeltDice values={dice} rolls={box.rolls} />
          <div className="nf-hint-row">
            {mayOne ? (
              <div className="nf-one" role="radiogroup" aria-label={t('How many dice')}>
                {[false, true].map((one) => (
                  <button key={String(one)} type="button" role="radio" aria-checked={oneDie === one} className={`nf-one-btn${oneDie === one ? ' on' : ''}`} onClick={() => setOneDie(one)}>
                    {one ? t('1 die') : t('2 dice')}
                  </button>
                ))}
              </div>
            ) : (
              <p className="nf-hint" aria-live="polite">
                {hint}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="nf-actions">
        {m.phase === 'handover' ? (
          <BigButton size="xl" onClick={nextTurn}>
            {t('Pass to {name}', { name: byId(m.order[m.turn + 1]).name })}
          </BigButton>
        ) : (
          <BigButton size="xl" disabled={dice ? !ready : box.rolling || box.over || falling.length > 0} onClick={dice ? flipDown : roll}>
            {box.rolling ? t('Rolling …') : dice ? t('Flip down') : t('Roll')}
          </BigButton>
        )}
      </div>
    </div>
  );
}

function TurnTitle({ m, who, setup }: { m: Match; who: Player; setup: Setup }) {
  const round =
    setup.mode === 'tournament'
      ? t('Round {n} of {of}', { n: m.round, of: setup.rounds })
      : setup.mode === 'daily'
        ? t('Daily challenge · {date}', { date: today() })
        : t('Round {n}', { n: m.round });
  return (
    <div className="nf-turn">
      <span className="nf-turn-round">{round}</span>
      <span className="nf-turn-who">{t('{name}’s box', { name: who.name })}</span>
    </div>
  );
}

/* ---------- After a round ---------- */

function RoundEnd({
  m,
  setM,
  players,
  byId,
  scores,
  totals,
  onSetup,
}: {
  m: Match;
  setM: PlayProps['setM'];
  players: Player[];
  byId: (id: string) => Player;
  scores: Record<string, number>;
  totals: Record<string, number>;
  onSetup: () => void;
}) {
  const { setup } = m;
  const solo = m.order.length < 2;
  const { best, worst } = ranking(scores);
  const shut = Object.keys(scores).filter((id) => scores[id] === 0);

  // Survival: lives go once, when the round ends.
  const lives = setup.mode === 'survival' ? loseLives(m.lives, scores) : m.lives;
  const alive = m.order.filter((id) => lives[id] > 0);
  const last = setup.mode === 'tournament' ? m.round >= setup.rounds : setup.mode === 'survival' ? alive.length <= 1 : setup.mode === 'daily';
  const final = last ? ranking(setup.mode === 'tournament' ? totals : setup.mode === 'survival' ? Object.fromEntries(m.order.map((id) => [id, -lives[id]])) : scores) : null;

  // The day's best on this phone.
  const dailyKey = `number-flip-daily-${setup.size}-${setup.level}`;
  const [dayBest] = useState(() => {
    if (setup.mode !== 'daily') return null;
    const saved = load<{ date: string; best: number } | null>(dailyKey, null);
    const mine = Math.min(...Object.values(scores));
    const before = saved?.date === today() ? saved.best : null;
    const now = before == null ? mine : Math.min(before, mine);
    save(dailyKey, { date: today(), best: now });
    return { before, now };
  });

  const celebrated = useRef(false);
  useEffect(() => {
    if (!celebrated.current && last && !shut.length) {
      celebrated.current = true;
      celebrate();
    }
  }, [last, shut.length]);

  const names = (ids: string[]) => ids.map((id) => byId(id).name).join(', ');
  let drinks = '';
  if (setup.mode === 'survival') drinks = worst.length ? t('{names}: lose a life and drink 1', { names: names(worst) }) : t('All level: nobody loses a life');
  else if (setup.mode === 'tournament') drinks = last && final?.worst.length ? t('{names}: highest total, drink 3', { names: names(final.worst) }) : '';
  else if (!solo) drinks = shut.length ? t('{names} shut the box: everyone else drinks 2', { names: names(shut) }) : worst.length ? t('{names}: highest score, drink 2', { names: names(worst) }) : t('All level: nobody drinks');

  const next = () =>
    setM((x) =>
      x
        ? {
            ...x,
            round: x.round + 1,
            order: setup.mode === 'survival' ? x.order.filter((id) => lives[id] > 0) : x.order,
            lives,
            turn: 0,
            box: freshBox(setup.size),
            scores: [...x.scores, {}],
            phase: 'turn',
          }
        : x,
    );
  const again = () =>
    setM({
      setup,
      round: 1,
      order: players.map((p) => p.id),
      turn: 0,
      box: freshBox(setup.size),
      scores: [{}],
      lives: Object.fromEntries(players.map((p) => [p.id, LIVES])),
      phase: 'turn',
    });

  const rows = [...m.order].sort((a, b) => (setup.mode === 'tournament' ? totals[a] - totals[b] : scores[a] - scores[b]));
  const title = last
    ? final && final.best.length === 1
      ? solo
        ? t('{n} left open', { n: scores[final.best[0]] })
        : t('{name} wins!', { name: byId(final.best[0]).name })
      : t('A tie!')
    : t('Round {n}', { n: m.round });

  return (
    <div className="bd nf-end">
      <Finished game="number-flip" players={m.order.map(byId)} />
      <div className="bd-head center">
        <span className="nf-end-kicker">{setup.mode === 'daily' ? t('Daily challenge · {date}', { date: today() }) : t(MODE_INFO[setup.mode].name)}</span>
        <h2 className="bd-title big">{title}</h2>
        {!last && best.length > 0 && !solo && <p className="lead">{t('Lowest this round: {names}', { names: names(best) })}</p>}
      </div>
      <section className="panel nf-table">
        {rows.map((id) => {
          const p = byId(id);
          return (
            <div key={id} className={`nf-row${best.includes(id) ? ' best' : ''}`}>
              <span className="bd-avatar xs" style={{ background: p.color }}>
                <Avatar avatar={p.avatar} photo={p.photo} />
              </span>
              <span className="nf-row-name">{p.name}</span>
              {setup.mode === 'survival' && <span className="nf-row-lives">{'❤️'.repeat(lives[id]) || t('Out')}</span>}
              <span className="nf-row-score">{scores[id] === 0 ? t('Shut!') : scores[id]}</span>
              {setup.mode === 'tournament' && <span className="nf-row-total">{t('{n} pts', { n: totals[id] })}</span>}
            </div>
          );
        })}
      </section>
      {drinks && <p className="nf-drinks">{drinks}</p>}
      {dayBest && (
        <p className="nf-mode-text">
          {dayBest.before == null || dayBest.now < dayBest.before ? t('Your best today: {n}', { n: dayBest.now }) : t('Your best today is still {n}', { n: dayBest.now })}
        </p>
      )}
      <div className="sticky-action nf-end-actions">
        {last ? (
          <>
            <BigButton size="xl" onClick={again}>
              {t('Play again')}
            </BigButton>
            <button type="button" className="text-btn" onClick={onSetup}>
              {t('Change the mode')}
            </button>
          </>
        ) : (
          <>
            <BigButton size="xl" onClick={next}>
              {setup.mode === 'tournament' ? t('Round {n} of {of}', { n: m.round + 1, of: setup.rounds }) : t('Next round')}
            </BigButton>
            <button type="button" className="text-btn" onClick={onSetup}>
              {t('Change the mode')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
