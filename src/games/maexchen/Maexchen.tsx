import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import Sheet from '../../components/Sheet';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';
import mat from './mat.webp';
import { allowedAfter, announce, believe, isDouble, MAEXCHEN, newRound, peek, reveal, shake, valueOf, VALUES, type Round, type Value } from './logic';
import Finished from '../../components/Finished';
import Avatar from '../../components/Avatar';

const SHAKE_MS = 650;
/** When the verdict lands after the cup is lifted (matches the CSS). */
const STAMP_MS = 450;

export default function Maexchen({ players }: GameProps) {
  const known = useApp().knows('maexchen');
  const [starterId, setStarterId] = useState(() => pick(players).id);
  const [r, setR] = useState<Round | null>(null);

  if (!r) {
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('Who starts?')}</h2>
          {!known && <p className="lead">{t('Then the cup goes round to the left. Lie well, doubt better.')}</p>}
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
          <BigButton size="xl" onClick={() => setR(newRound(Math.max(0, players.findIndex((p) => p.id === starterId))))}>
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  return <MaexchenTable r={r} setR={setR} players={players} known={known} />;
}

function MaexchenTable({
  r,
  setR,
  players,
  known,
}: {
  r: Round;
  setR: (r: Round) => void;
  players: GameProps['players'];
  known: boolean;
}) {
  const n = players.length;
  const [shaking, setShaking] = useState(false);
  // Holding the cup up to look under it.
  const [lifted, setLifted] = useState(false);
  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState<Value | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const claim = r.claim;
  const next = (r.turn + 1) % n;
  // Whoever decides now: in 'pass' the next player (believe or lift), otherwise the one at turn.
  const who = players[r.phase === 'pass' ? next : r.verdict ? r.verdict.loser : r.turn];
  const open = r.phase === 'reveal';
  const mustLift = r.phase === 'pass' && claim?.value === MAEXCHEN;
  // Rounds go on and on: the game counts once a first round is decided.
  const [decided, setDecided] = useState(false);
  useEffect(() => {
    if (r.verdict) setDecided(true);
  }, [r.verdict]);

  /** Shake cup and coaster together for a moment, then the dice are rolled. */
  const doShake = (base: Round = r) => {
    if (shaking) return;
    setLifted(false);
    setShaking(true);
    buzz([20, 40, 20, 40, 20, 40, 30]);
    [0, 110, 230, 340, 450].forEach((d) => window.setTimeout(() => sfx.tick(), d));
    timer.current = window.setTimeout(() => {
      setShaking(false);
      setR(shake(base));
      sfx.pop();
    }, SHAKE_MS);
  };

  const lookDown = () => {
    if (r.phase !== 'look' || shaking) return;
    if (r.blind) {
      buzz([30, 30, 30]);
      return;
    }
    setLifted(true);
    buzz(8);
    if (!r.peeked) setR(peek(r));
  };
  const lookUp = () => setLifted(false);

  const allowed = allowedAfter(claim?.value ?? null);

  const doAnnounce = () => {
    if (choice == null) return;
    setPicking(false);
    setLifted(false);
    sfx.pop();
    buzz();
    setR(announce(r, choice));
    setChoice(null);
  };

  /** Believed: the cup goes to the next player and shakes right away. */
  const doBelieve = () => {
    const next = believe(r, n);
    if (next === r) return;
    setR(next);
    doShake(next);
  };

  const doReveal = () => {
    const out = reveal(r, n);
    setR(out);
    // The cup flies off first, then the verdict lands like a stamp.
    timer.current = window.setTimeout(() => {
      if (out.verdict?.truth) sfx.boo();
      else sfx.tada();
      buzz([60, 40, 120]);
    }, STAMP_MS);
  };

  // What to do now, on the table (the player row only says who).
  const hint =
    r.phase === 'shake'
      ? shaking
        ? null
        : claim
          ? t('Believed it: now beat {value}', { value: label(claim.value) })
          : t('Tap the cup to shake')
      : r.phase === 'look'
        ? r.blind
          ? t('Shaken blind: no more looking, announce something')
          : lifted
            ? null
            : r.peeked
              ? t('Announce, or shake once more blind')
              : t('Hold the cup to look under it')
        : null;

  return (
    <div className="mx fill">
      {decided && <Finished game="maexchen" />}
      {/* Who drinks how much stays up even on a clean table (class verdict). */}
      <div className={`mx-status${r.phase === 'reveal' && r.verdict ? ' verdict' : ''}`}>
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: who.color }}>
            <Avatar avatar={who.avatar} photo={who.photo} />
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{who.name}</span>
            <span className="bd-player-sub">
              {r.phase === 'reveal' && r.verdict
                ? r.verdict.sips === 1
                  ? t('drinks 1 sip')
                  : t('drinks {n} sips', { n: r.verdict.sips })
                : t('your turn')}
            </span>
          </span>
        </div>
        <div className="mx-claim" aria-live="polite">
          <span className="mx-claim-label">{claim ? (r.phase === 'pass' || r.phase === 'reveal' ? t('{name} says', { name: players[claim.by].name }) : t('To beat')) : t('New round')}</span>
          {claim ? <ValueText v={claim.value} /> : <span className="mx-claim-any">{t('Anything')}</span>}
        </div>
      </div>

      <div className={`mx-table${open && r.verdict ? (r.verdict.truth ? ' truth' : ' lie') : ''}`}>
        {hint && (
          <span key={hint} className={`mx-hint${r.blind && r.phase === 'look' ? ' warn' : ''}`}>
            {hint}
          </span>
        )}
        {r.phase === 'pass' && (
          <span className="mx-handoff" key={next} style={{ '--who': who.color } as CSSProperties}>
            <span className="mx-handoff-avatar" style={{ background: who.color }}>
              <Avatar avatar={who.avatar} photo={who.photo} />
            </span>
            <span className="mx-handoff-text">{t('Hand the phone to {name}', { name: who.name })}</span>
            <span className="mx-handoff-sub">{mustLift ? t('Mäxchen: you have to lift the cup') : t('believe it or lift the cup?')}</span>
          </span>
        )}
        <div className={`mx-rig${shaking ? ' shaking' : ''}`}>
          <Coaster />
          <span className="mx-dice">
            <Die n={r.dice[0]} />
            <Die n={r.dice[1]} />
          </span>
          <button
            type="button"
            className={`mx-cup${lifted ? ' lifted' : ''}${open ? ' off' : ''}`}
            aria-label={r.phase === 'shake' ? t('Shake the cup') : r.phase === 'look' && !r.blind ? t('Hold to look under the cup') : t('Dice cup')}
            disabled={!(r.phase === 'shake' || r.phase === 'look')}
            onClick={() => r.phase === 'shake' && doShake()}
            onPointerDown={(e) => {
              if (r.phase !== 'look') return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              lookDown();
            }}
            onPointerUp={lookUp}
            onPointerCancel={lookUp}
            onLostPointerCapture={lookUp}
            onKeyDown={(e) => {
              if (r.phase === 'look' && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                if (lifted) lookUp();
                else lookDown();
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Cup />
          </button>
        </div>
        {open && r.verdict && claim && (
          <div className={`mx-verdict${r.verdict.truth ? ' truth' : ' lie'}`} role="status">
            <span className="mx-stamp">{r.verdict.truth ? t('It’s true!') : t('Lie!')}</span>
            <span className="mx-verdict-sub">
              {t('{actual} under the cup, {claim} announced', { actual: label(valueOf(r.dice)), claim: label(claim.value) })}
            </span>
          </div>
        )}
      </div>

      <div className="sticky-action stack mx-actions">
        {r.phase === 'shake' && (
          <>
            <BigButton onClick={() => doShake()} disabled={shaking}>
              {t('Shake')}
            </BigButton>
            <span className="mx-slot" />
          </>
        )}
        {r.phase === 'look' && (
          <>
            <BigButton onClick={() => setPicking(true)}>
              {t('Announce…')}
            </BigButton>
            <BigButton variant="light" onClick={() => doShake()} disabled={!r.peeked || r.blind || shaking}>
              {r.blind ? t('Shaken blind 🙈') : t('Shake once more, blind')}
            </BigButton>
          </>
        )}
        {r.phase === 'pass' && claim && (
          <>
            {mustLift ? (
              <span className="mx-slot mx-must">{t('Mäxchen! Nothing beats it: lift the cup.')}</span>
            ) : (
              <BigButton onClick={doBelieve}>{t('Believe it and shake')}</BigButton>
            )}
            <BigButton variant="danger" onClick={doReveal}>
              {t('Lift the cup!')}
            </BigButton>
          </>
        )}
        {r.phase === 'reveal' && r.verdict && (
          <>
            <BigButton onClick={() => setR(newRound(r.verdict!.loser))}>
              {t('New round: {name} starts', { name: players[r.verdict.loser].name })}
            </BigButton>
            <span className="mx-slot" />
          </>
        )}
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title={t('What do you announce?')} closeLabel={t('Cancel')}>
        <div className="mx-values">
          {VALUES.map((v) => {
            const ok = allowed.includes(v);
            return (
              <button
                key={v}
                type="button"
                className={`mx-value${choice === v ? ' on' : ''}${v === MAEXCHEN ? ' max' : isDouble(v) ? ' double' : ''}`}
                disabled={!ok}
                aria-pressed={choice === v}
                aria-label={label(v)}
                onClick={() => {
                  sfx.tick();
                  buzz(6);
                  setChoice(v);
                }}
              >
                <span className="mx-value-num">{v}</span>
                {v === MAEXCHEN ? <span className="mx-value-name">{t('Mäxchen')}</span> : isDouble(v) && <span className="mx-value-tag">{t('Double')}</span>}
              </button>
            );
          })}
        </div>
        {!known && <p className="fine-print">{t('Low to high: 31 … 65, then the doubles, then the Mäxchen (21).')}</p>}
        <BigButton size="xl" onClick={doAnnounce} disabled={choice == null}>
          {choice == null ? t('Pick a value') : t('Announce {value}', { value: label(choice) })}
        </BigButton>
      </Sheet>
    </div>
  );
}

/** "54", "Double 4s" or "Mäxchen". */
function label(v: Value) {
  if (v === MAEXCHEN) return t('Mäxchen');
  if (isDouble(v)) return t('Double {n}s', { n: v % 10 });
  return String(v);
}

function ValueText({ v }: { v: Value }) {
  return (
    <span className="mx-claim-value">
      {v === MAEXCHEN ? t('Mäxchen') : v}
      {isDouble(v) && <span className="mx-claim-tag">{t('Double')}</span>}
    </span>
  );
}

/** Where the pips sit on a die (in a 0–100 square) for each number. */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [27, 27],
    [73, 27],
    [50, 50],
    [27, 73],
    [73, 73],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

function Die({ n }: { n: number }) {
  return (
    <svg className="mx-die" viewBox="0 0 100 100" role="img" aria-label={String(n)}>
      <rect x="4" y="8" width="92" height="88" rx="20" className="mx-die-side" />
      <rect x="4" y="2" width="92" height="88" rx="20" className="mx-die-face" />
      {PIPS[n].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y - 4} r="9" className={n === 1 ? 'mx-pip one' : 'mx-pip'} />
      ))}
    </svg>
  );
}

/** The beer mat under the cup, lying on the table at an angle, with its edge showing. */
function Coaster() {
  return (
    <span className="mx-coaster" aria-hidden>
      <span className="mx-mat" style={{ '--mat': `url(${mat})` } as CSSProperties}>
        {/* The cardboard's white edge: the mat a few times over, stacked below the print. */}
        {[6, 5, 4, 3, 2, 1].map((i) => (
          <span key={i} className="mx-mat-layer edge" style={{ '--i': i } as CSSProperties} />
        ))}
        <span className="mx-mat-layer" />
      </span>
    </span>
  );
}

/** The leather dice cup (like the one in 5000), upside down on the mat: its closed bottom on top. */
function Cup() {
  return (
    <svg viewBox="0 0 100 110" aria-hidden>
      <path className="mx-cup-body" d="M23 10h54l10 86Q50 108 13 96z" />
      <path className="mx-cup-band" d="M14.6 82Q50 94 85.4 82L87 96Q50 108 13 96z" />
      <ellipse className="mx-cup-top" cx="50" cy="10" rx="27" ry="7" />
      <path className="mx-cup-stitch" d="M21 24Q50 33 79 24M16 78Q50 90 84 78" />
      <path className="mx-cup-shine" d="M30 18l-7 70" />
    </svg>
  );
}
