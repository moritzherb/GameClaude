import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Finished from '../../components/Finished';
import Sheet from '../../components/Sheet';
import { getLang, t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { useTurnBubble } from '../../lib/turn';
import type { Player } from '../../state/AppState';
import { BigDie, BigRoll, BigToss, PawnIcon, TossStage, useRoll } from './bits';
import type { Thrown } from './solid3d';
import { jumps, type Board } from './boards';
import FieldCard, { type Outcome } from './FieldCard';
import { ACE } from './ace';
import { FIELDS, param, type Field } from './fields';
import { AceCard, FieldIcon } from './FieldIcon';
import { current, finish, newGame, nextTurn, setPawn, walk, walkBack, type Game } from './logic';
import type { PawnDef } from './pawns';
import { Scene } from './scene';

type Phase =
  | { kind: 'turn' }
  | { kind: 'busy' }
  | { kind: 'field'; pos: number; field: Field; chosen?: Field }
  | { kind: 'note'; emoji: string; title: string; text?: string; then: 'next' | 'again' }
  | { kind: 'over' };

interface Props {
  board: Board;
  players: Player[];
  pawns: Record<string, PawnDef>;
  exit: () => void;
  onAgain: () => void;
}

/** The game itself: the board from above, whose turn it is, the die, and the card for each field. */
export default function Play({ board, players, pawns, exit, onAgain }: Props) {
  const [g, setG] = useState(() => newGame(board.fields, players.map((p) => p.id)));
  const gRef = useRef(g);
  const commit = (x: Game) => {
    gRef.current = x;
    setG(x);
  };
  const [phase, setPhase] = useState<Phase>({ kind: 'turn' });
  // The camera's off the pawn: moved by a finger, or showing the whole board.
  const [away, setAway] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const roller = useRoll();
  // The Tschick pack and the snus tin, thrown onto the middle of the board by the cards.
  const [thrown, setThrown] = useState<{ what: Thrown | null; flip: number }>({ what: null, flip: 0 });
  const toss = useCallback((what: Thrown) => setThrown((x) => ({ what, flip: x.flip + 1 })), []);
  // Done with the card (Done, Next): the pack or the tin is gone at once, not lying there a moment
  // longer while the next one rolls.
  useLayoutEffect(() => {
    if (phase.kind !== 'field') setThrown((x) => (x.what ? { ...x, what: null } : x));
  }, [phase.kind]);
  const { die, roll } = roller;
  const canvas = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const byId = useCallback((id: string) => players.find((p) => p.id === id)!, [players]);
  const me = byId(current(g));
  const pawn = g.pawns[me.id];
  const last = finish(g);
  const targets = useMemo(() => jumps(board), [board]);
  useTurnBubble(phase.kind === 'over' ? null : me);

  // The board's scene: made once, told about the board in the current language.
  const lang = getLang();
  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const s = new Scene(c);
    s.onAway = setAway;
    scene.current = s;
    const ro = new ResizeObserver(() => s.resize());
    ro.observe(c);
    return () => {
      ro.disconnect();
      s.destroy();
      scene.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    scene.current?.setBoard(
      board,
      board.fields.map((f) => FIELDS[f.kind].label(param(f))),
    );
  }, [board, lang]);
  const views = useMemo(
    () => players.map((p) => ({ id: p.id, pawn: pawns[p.id], pos: g.pawns[p.id].pos, name: p.name, gate: g.pawns[p.id].gate, crossed: g.pawns[p.id].crossed })),
    [players, pawns, g.pawns],
  );
  useLayoutEffect(() => {
    scene.current?.setPawns(views, phase.kind === 'over' ? null : me.id);
  }, [views, me.id, phase.kind]);
  // First picture: right at the first player's pawn.
  useLayoutEffect(() => {
    scene.current?.follow(current(gRef.current), true);
  }, []);
  // The pawn stays in view above the cards and the die, at the same height whatever shows there:
  // the room kept free at the bottom is fixed (the cards' heights would move the board every time).
  useLayoutEffect(() => {
    const update = () => scene.current?.setInsets(top.current?.offsetHeight ?? 0, Math.round((canvas.current?.clientHeight ?? 700) * 0.4));
    const ro = new ResizeObserver(update);
    if (top.current) ro.observe(top.current);
    if (canvas.current) ro.observe(canvas.current);
    update();
    return () => ro.disconnect();
  }, []);

  const next = () => {
    const x = nextTurn(gRef.current);
    commit(x);
    setPhase({ kind: 'turn' });
    scene.current?.follow(current(x));
  };

  const land = (id: string, pos: number) => {
    const f = gRef.current.fields[pos];
    if (f.kind === 'goal') {
      commit({ ...gRef.current, winner: id });
      celebrate();
      setPhase({ kind: 'over' });
      return;
    }
    if (f.kind === 'start') return next();
    buzz(20);
    if (f.kind === 'bridge') commit(setPawn(gRef.current, id, { gate: true }));
    setPhase({ kind: 'field', pos, field: f });
  };

  const move = async (id: string, path: number[]) => {
    setPhase({ kind: 'busy' });
    await scene.current?.hop(id, path, () => sfx.tick());
    const pos = path[path.length - 1];
    commit(setPawn(gRef.current, id, { pos, crossed: false }));
    land(id, pos);
  };

  /** One thing at a time from the buttons: a second tap while the first is still going on (a roll,
   *  a move, a crossing) does nothing. */
  const acting = useRef(false);
  const act = (fn: () => unknown) => async () => {
    if (acting.current) return;
    acting.current = true;
    try {
      await fn();
    } finally {
      acting.current = false;
    }
  };

  const rollTurn = async () => {
    const x = gRef.current;
    const id = current(x);
    const p = x.pawns[id];
    scene.current?.follow(id);
    setPhase({ kind: 'busy' });
    const v = await roll();
    if (p.jailed) {
      if (v === 6) {
        commit(setPawn(gRef.current, id, { jailed: false }));
        setPhase({ kind: 'note', emoji: '🔓', title: t('A 6! Out of prison'), text: t('Roll again to move on.'), then: 'again' });
      } else setPhase({ kind: 'note', emoji: '⛓️', title: t('No 6: still locked up'), then: 'next' });
      return;
    }
    if (p.gate) {
      const need = param(x.fields[p.pos]) ? [1, 2] : [5, 6];
      if (need.includes(v)) {
        commit(setPawn(gRef.current, id, { gate: false, crossed: true }));
        await scene.current?.cross(id);
        setPhase({ kind: 'note', emoji: '🌉', title: t('Over you go!'), text: t('Roll again to move on.'), then: 'again' });
      } else setPhase({ kind: 'note', emoji: '🍻', title: t('Not this time: drink 1 and wait.'), then: 'next' });
      return;
    }
    await move(id, walk(x.fields, p.pos, v));
  };

  /** The Ace, played on the prison or the bridge before rolling: free to go. */
  const aceOut = async () => {
    const id = current(gRef.current);
    const p = gRef.current.pawns[id];
    commit(setPawn(gRef.current, id, { aces: p.aces - 1, jailed: false, gate: false, crossed: p.gate }));
    sfx.pop();
    if (p.gate) {
      setPhase({ kind: 'busy' });
      await scene.current?.cross(id);
      setPhase({ kind: 'turn' });
    }
  };

  const resolve = async (o: Outcome, pos: number, f: Field) => {
    const id = current(gRef.current);
    let x = gRef.current;
    if (o.ace) x = setPawn(x, id, { aces: x.pawns[id].aces - 1 });
    if (o.update) x = o.update(x);
    commit(x);
    if (o.then === 'travel' && !o.ace) {
      setPhase({ kind: 'busy' });
      const to = o.to ?? targets[pos] ?? pos;
      await scene.current?.travel(id, to, f.kind === 'mole');
      commit(setPawn(gRef.current, id, { pos: to }));
      return next();
    }
    if (o.then === 'back' && o.steps) {
      const path = walkBack(pos, o.steps);
      if (path.length) return move(id, path);
    }
    if (o.then === 'again') {
      // Over the bridge: across it to its far end, then roll again. The button that said so rolls:
      // no second button to roll with.
      if (f.kind === 'bridge') {
        setPhase({ kind: 'busy' });
        await scene.current?.cross(id);
      }
      return rollTurn();
    }
    next();
  };

  const effects: { key: string; icon: string; text: string }[] = [
    ...g.rules.map((r, i) => ({ key: `r${i}`, icon: '📜', text: r })),
    ...g.mates.map(([a, b], i) => ({ key: `m${i}`, icon: '🤝', text: `${byId(a).name} & ${byId(b).name}` })),
    ...(g.silence ? [{ key: 's', icon: '🤫', text: t('Silence until {name} is on', { name: byId(g.silence).name }) }] : []),
    ...g.order.filter((id) => g.pawns[id].aces > 0).map((id) => ({ key: `a${id}`, icon: ACE, text: g.pawns[id].aces > 1 ? `${byId(id).name} ×${g.pawns[id].aces}` : byId(id).name })),
  ];

  if (phase.kind === 'over' && g.winner) {
    const ranked = [...players].sort((a, b) => g.pawns[b.id].pos - g.pawns[a.id].pos);
    const winner = byId(g.winner);
    return (
      <div className="bd pt-over">
        <Finished game="party" />
        <div className="bd-head center">
          <span className="pt-over-pawn">
            <PawnIcon pawn={pawns[winner.id]} size={120} />
          </span>
          <span className="kicker">{t('Game over')}</span>
          <h2 className="bd-title big">{t('{name} wins!', { name: winner.name })}</h2>
        </div>
        <section className="panel">
          <div className="ftd-tally">
            {ranked.map((p, i) => (
              <div key={p.id} className="ftd-tally-row">
                <span className="pt-rank">{i + 1}.</span>
                <span className="bd-avatar xs" style={{ background: p.color }}>
                  <Avatar avatar={p.avatar} photo={p.photo} />
                </span>
                <span className="ftd-tally-name">{p.name}</span>
                <span className="ftd-tally-num">{p.id === g.winner ? '🏆' : t('Field {n}', { n: g.pawns[p.id].pos })}</span>
              </div>
            ))}
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

  const need = pawn.gate ? (param(g.fields[pawn.pos]) ? t('Roll a 1 or 2') : t('Roll a 5 or 6')) : null;
  const here = g.fields[pawn.pos];
  let status =
    pawn.pos === 0
      ? t('At the start · {total} fields to go', { total: last })
      : t('Field {n} of {total} · {field}', {
          n: pawn.pos,
          total: last,
          // (The Ace's card is a picture of its own, not a character: just its name in the line.)
          field: FIELDS[here.kind].emoji === ACE ? FIELDS[here.kind].title(param(here)) : `${FIELDS[here.kind].emoji} ${FIELDS[here.kind].title(param(here))}`,
        });
  if (pawn.jailed) status = t('In prison: only a 6 gets you out');
  else if (pawn.gate) status = param(g.fields[pawn.pos]) ? t('At the bridge: a 1 or 2 gets you over') : t('At the bridge: a 5 or 6 gets you over');

  return (
    <div className="pt-play fill">
      <canvas ref={canvas} className="pt-canvas" />
      <div ref={top} className="pt-top">
        <div className="pt-effects">
          {effects.map((e) => (
            <button key={e.key} type="button" className="pt-effect" onClick={() => setShowEffects(true)}>
              <span aria-hidden>{e.icon}</span>
              <span className="pt-effect-text">{e.text}</span>
            </button>
          ))}
        </div>
        {away ? (
          <button
            type="button"
            className="pt-back-btn pop-in"
            style={{ '--chip': me.color } as CSSProperties}
            aria-label={t('Back to the pawn')}
            onClick={() => {
              sfx.tick();
              scene.current?.follow(current(gRef.current));
            }}
          >
            <PawnIcon pawn={pawns[me.id]} size={32} />
          </button>
        ) : (
          <button
            type="button"
            className="round-btn pt-view-btn"
            aria-label={t('Whole board')}
            onClick={() => {
              sfx.tick();
              scene.current?.showAll();
            }}
          >
            🗺️
          </button>
        )}
      </div>

      <BigDie value={die.value} flip={die.flip} />
      <TossStage what={thrown.what} flip={thrown.flip} />

      <BigToss.Provider value={toss}>
      <BigRoll.Provider value={roller}>
        <div className="pt-panel">
          {phase.kind === 'field' ? (
            <FieldCard
              key={`${phase.pos}-${phase.chosen?.kind ?? ''}`}
              field={phase.chosen ?? phase.field}
              chosen={!!phase.chosen}
              pos={phase.pos}
              g={g}
              target={targets[phase.pos]}
              players={players}
              lander={me}
              onDone={(o) => act(() => resolve(o, phase.pos, phase.chosen ?? phase.field))()}
              onChoose={(f) => setPhase({ ...phase, chosen: f })}
            />
          ) : phase.kind === 'note' ? (
            <div className="pt-card slide-up" style={{ '--field': FIELDS[pawn.jailed ? 'prison' : 'bridge'].color } as CSSProperties}>
              <div className="pt-card-head">
                <span className="pt-card-emoji">{phase.emoji}</span>
                <span className="pt-card-heading">
                  <span className="pt-card-kicker">{me.name}</span>
                  <span className="pt-card-title">{phase.title}</span>
                </span>
              </div>
              {phase.text && <p className="pt-card-text">{phase.text}</p>}
              <div className="pt-card-actions">
                <BigButton size="xl" onClick={act(() => (phase.then === 'again' ? rollTurn() : next()))}>
                  {phase.then === 'again' ? t('Roll again') : t('Done')}
                </BigButton>
              </div>
            </div>
          ) : (
            <div className="pt-turn">
              <div className="pt-turn-who" style={{ '--chip': me.color } as CSSProperties}>
                <PawnIcon pawn={pawns[me.id]} size={44} />
                <span className="pt-turn-text">
                  <span className="pt-turn-name">{me.name}</span>
                  <span className="pt-turn-sub">{status}</span>
                </span>
              </div>
              <div className="pt-card-actions">
                {(pawn.jailed || pawn.gate) && pawn.aces > 0 && phase.kind === 'turn' && (
                  <button type="button" className="pt-ace-btn" onClick={aceOut}>
                    <AceCard /> {t('Play your Ace')}
                  </button>
                )}
                <BigButton size="xl" disabled={phase.kind !== 'turn'} onClick={act(rollTurn)}>
                  {pawn.jailed ? t('Roll for a 6') : (need ?? t('Roll the die'))}
                </BigButton>
              </div>
            </div>
          )}
        </div>
      </BigRoll.Provider>
      </BigToss.Provider>
      <Sheet open={showEffects} onClose={() => setShowEffects(false)} title={t('In play')}>
        <div className="kc-effects">
          {effects.map((e) => (
            <div key={e.key} className="kc-effect">
              <span className="kc-effect-icon">
                <FieldIcon emoji={e.icon} />
              </span>
              <span>{e.key.startsWith('a') ? t('{name} has an Ace up their sleeve', { name: e.text }) : e.text}</span>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
