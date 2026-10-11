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

const THROW_MS = 750;

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

/** Where the two pigs lie: spread out a little, never on top of each other. */
interface Spot {
  x: number;
  y: number;
  rot: number;
}

function landing(th: Throw | null): [Spot, Spot] {
  if (th?.kind === 'touch') return [
    { x: 41, y: 56, rot: -8 },
    { x: 61, y: 54, rot: 172 },
  ];
  if (th?.kind === 'piggyback') return [
    { x: 50, y: 60, rot: 0 },
    { x: 52, y: 47, rot: -6 },
  ];
  const j = () => Math.random() * 2 - 1;
  return [
    { x: 30 + j() * 6, y: 52 + j() * 10, rot: j() * 25 },
    { x: 70 + j() * 6, y: 56 + j() * 10, rot: j() * 25 },
  ];
}

function Table({ g, setG, players, known }: { g: Game; setG: (g: Game) => void; players: GameProps['players']; known: boolean }) {
  const [throwing, setThrowing] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const who = players[g.turn];
  const th = g.last;
  const [spots, setSpots] = useState<[Spot, Spot]>(() => landing(null));
  const table = useRef<HTMLDivElement>(null);

  // New pigs on the table: they tumble in from above.
  useLayoutEffect(() => {
    if (!th || !table.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    table.current.querySelectorAll<HTMLElement>('.sw-spot').forEach((el, i) => {
      el.animate(
        [
          { transform: `translate(-50%, -50%) translate(${i ? 40 : -40}px, -260px) rotate(${i ? 540 : -480}deg) scale(0.7)`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { transform: `translate(-50%, -50%) rotate(var(--rot)) scale(1)` },
        ],
        { duration: 620, delay: i * 70, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.1)', fill: 'backwards' },
      );
    });
  }, [th]);

  const doThrow = () => {
    if (throwing || g.ended) return;
    setThrowing(true);
    buzz([15, 30, 15]);
    sfx.tick();
    timer.current = window.setTimeout(() => {
      setThrowing(false);
      const out = throwPigs();
      setSpots(landing(out));
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
    }, THROW_MS);
  };

  const doBank = () => {
    sfx.tada();
    buzz([30, 30, 60]);
    setG(bank(g));
  };

  const bad = th && th.kind !== 'score';
  const result = th && !throwing && (
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
  );

  const showPigs: [Pose, Pose] | null = th ? (th.kind === 'score' || th.kind === 'pig-out' ? th.pigs : th.kind === 'touch' ? ['side-dot', 'side'] : ['back', 'standing']) : null;

  return (
    <div className="mx fill sw">
      <div className="mx-status">
        <div className="mx-turn" key={who.id} style={{ '--who': who.color } as CSSProperties}>
          <span className="bd-avatar" style={{ background: who.color }}>
            {who.avatar}
          </span>
          <span className="mx-turn-text">
            <span className="mx-turn-label">{t('Your turn')}</span>
            <span className="mx-turn-name">{who.name}</span>
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

      <div className={`mx-table sw-table${throwing ? ' throwing' : ''}`} ref={table}>
        {!th && !throwing && <span className="mx-hint">{known ? t('Throw the pigs') : t('Throw the pigs. Stop in time and put your points in the pen.')}</span>}
        {throwing && (
          <span className="sw-hand" aria-hidden>
            <Pig pose="side-dot" />
            <Pig pose="side" />
          </span>
        )}
        {showPigs &&
          !throwing &&
          showPigs.map((pose, i) => (
            <span
              key={`${g.turn}-${g.turnPts}-${g.scores.join()}-${i}`}
              className="sw-spot"
              style={{ left: `${spots[i].x}%`, top: `${spots[i].y}%`, '--rot': `${spots[i].rot}deg` } as CSSProperties}
            >
              <Pig pose={pose} />
              <span className="sw-pose">{t(POSE_NAME[pose])}</span>
            </span>
          ))}
        {result}
      </div>

      <div className="sticky-action stack mx-actions">
        {g.ended ? (
          <>
            <BigButton onClick={() => setG(nextPlayer(g))}>
              <NextName text={t('Next: {name} →')} name={players[(g.turn + 1) % players.length].name} />
            </BigButton>
            <span className="mx-slot" />
          </>
        ) : (
          <>
            <BigButton onClick={doThrow} disabled={throwing}>
              {t('Throw the pigs')}
            </BigButton>
            <BigButton variant="light" onClick={doBank} disabled={throwing || g.turnPts === 0}>
              {g.turnPts ? t('Into the pen: +{n}', { n: g.turnPts }) : t('Into the pen')}
            </BigButton>
          </>
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
