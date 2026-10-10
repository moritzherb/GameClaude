import { useEffect, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import DeckCount from '../../components/DeckCount';
import PlayingCard, { CardFace } from '../../components/PlayingCard';
import SuitIcon from '../../components/Suit';
import { t, tx } from '../../i18n';
import { SUITS, type Suit } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { behind, DEFAULT_ROWS, newRace, ROW_OPTIONS, sipsForRow, step, type Race } from './logic';

const SUIT_NAME: Record<Suit, string> = { hearts: tx('Hearts'), diamonds: tx('Diamonds'), spades: tx('Spades'), clubs: tx('Clubs') };
const RED = (s: Suit) => s === 'hearts' || s === 'diamonds';
const AUTO_MS = 1300;

export default function HorseRace({ players, exit }: GameProps) {
  const known = useApp().knows('horse-race');
  const [bets, setBets] = useState<Record<string, Suit>>({});
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [race, setRace] = useState<Race | null>(null);
  const [auto, setAuto] = useState(false);

  // Auto play: one card after the other, with a longer pause when someone gives out sips.
  useEffect(() => {
    if (!auto || !race || race.winner) return;
    const sideWithBackers = race.last?.kind === 'side' && players.some((p) => bets[p.id] === (race.last as { by: Suit }).by);
    const id = window.setTimeout(() => go(), sideWithBackers ? AUTO_MS * 2.5 : AUTO_MS);
    return () => window.clearTimeout(id);
  });

  // Let the winner cross the line on the track first, then show the result.
  const winner = race?.winner;
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    setFinished(false);
    if (!winner) return;
    setAuto(false);
    celebrate();
    const id = window.setTimeout(() => setFinished(true), 1600);
    return () => window.clearTimeout(id);
  }, [winner]);

  const backers = (suit: Suit) => players.filter((p) => bets[p.id] === suit);

  /* ---------- Bets ---------- */
  if (!race) {
    const allIn = players.every((p) => bets[p.id]);
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('Place your bets')}</h2>
          {!known && <p className="lead">{t('Everyone picks a suit. Its Ace is your horse. If it doesn’t win, you drink.')}</p>}
        </div>

        <div className="hs-bets">
          {players.map((p) => (
            <div key={p.id} className="hs-bet-row">
              <span className="bd-avatar xs" style={{ background: p.color }}>
                {p.avatar}
              </span>
              <span className="hs-bet-name">{p.name}</span>
              <span className="hs-bet-suits">
                {SUITS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`hs-suit${RED(s) ? ' red' : ''}${bets[p.id] === s ? ' on' : ''}`}
                    aria-label={t(SUIT_NAME[s])}
                    aria-pressed={bets[p.id] === s}
                    onClick={() => {
                      sfx.tick();
                      buzz(8);
                      setBets({ ...bets, [p.id]: s });
                    }}
                  >
                    <SuitIcon suit={s} />
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-btn"
          onClick={() => setBets(Object.fromEntries(players.map((p) => [p.id, bets[p.id] ?? pick(SUITS)])))}
        >
          {t('Random for the rest')}
        </button>

        <section className="section">
          <h3 className="section-title">{t('Track length')}</h3>
          <div className="seg">
            {ROW_OPTIONS.map((n) => (
              <button key={n} type="button" className={`seg-btn${rows === n ? ' active' : ''}`} onClick={() => setRows(n)}>
                <span className="seg-main">{n}</span>
                <span className="seg-sub">{t('rows')}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="sticky-action">
          <BigButton size="xl" disabled={!allIn} onClick={() => setRace(newRace(rows))}>
            {allIn ? t('And they’re off!') : t('Everyone needs a horse')}
          </BigButton>
        </div>
      </div>
    );
  }

  function go() {
    if (!race || race.winner) return;
    const next = step(race);
    if (next.last?.kind === 'side') {
      sfx.pop();
      buzz([30, 30, 30]);
    } else {
      sfx.tick();
      buzz(10);
    }
    setRace(next);
  }

  /* ---------- The finish ---------- */
  if (race.winner && finished) {
    const win = race.winner;
    const winners = backers(win);
    const losers = players.filter((p) => bets[p.id] !== win);
    return (
      <div className="bd hs-finish">
        <div className="bd-head center">
          <span className="kicker">{t('Photo finish')}</span>
          <span className="hs-finish-card">
            <PlayingCard card={{ value: 14, suit: win }} size="xl" />
          </span>
          <h2 className="bd-title big">{t('{suit} wins!', { suit: t(SUIT_NAME[win]) })}</h2>
          <p className="lead">
            {winners.length ? t('{names} bet right and drink nothing.', { names: winners.map((p) => p.name).join(' & ') }) : t('Nobody bet on it. Everyone drinks!')}
          </p>
        </div>
        {losers.length > 0 && (
          <section className="panel">
            <h3 className="section-title">{t('Drink up')}</h3>
            <div className="ftd-tally">
              {losers
                .map((p) => ({ p, n: behind(race, bets[p.id]) }))
                .sort((a, b) => b.n - a.n)
                .map(({ p, n }) => (
                  <div key={p.id} className="ftd-tally-row">
                    <span className="bd-avatar xs" style={{ background: p.color }}>
                      {p.avatar}
                    </span>
                    <span className="ftd-tally-name">{p.name}</span>
                    <span className={`hs-tally-suit${RED(bets[p.id]) ? ' red' : ''}`}>
                      <SuitIcon suit={bets[p.id]} />
                    </span>
                    <span className="ftd-tally-num">{n === 1 ? t('1 sip') : t('{n} sips', { n })}</span>
                  </div>
                ))}
            </div>
            {!known && <p className="fine-print">{t('One sip for every row your horse is behind.')}</p>}
          </section>
        )}
        <div className="sticky-action stack">
          <BigButton onClick={() => setRace(null)}>{t('Race again')}</BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------- The race ---------- */
  const s = race.last;
  const sideBackers = s?.kind === 'side' ? backers(s.by) : [];

  return (
    <div className="hs fill" style={{ '--rows': race.rows } as CSSProperties}>
      <div className="hs-track-wrap">
        <Track race={race} backers={backers} />
      </div>

      <div className="hs-now">
        {s ? (
          <>
            <span className={`hs-now-card${s.kind === 'side' ? ' side' : ''}`} key={race.log.length}>
              <PlayingCard card={s.card} size="md" />
            </span>
            <span className="hs-now-text">
              <span className="hs-now-title">
                {s.kind === 'side' ? t('Row {row}: side card!', { row: s.row }) : t('{suit} moves up', { suit: t(SUIT_NAME[s.card.suit]) })}
              </span>
              <span className="hs-now-sub">
                {s.kind === 'side'
                  ? sideBackers.length
                    ? (sipsForRow(s.row) === 1 ? t('{names} give out {n} sip', { names: sideBackers.map((p) => p.name).join(' & '), n: 1 }) : t('{names} give out {n} sips', { names: sideBackers.map((p) => p.name).join(' & '), n: sipsForRow(s.row) }))
                    : t('{suit} moves up', { suit: t(SUIT_NAME[s.card.suit]) })
                  : !known && race.log.length < 3
                    ? t('The first Ace into a row turns its side card over.')
                    : null}
              </span>
            </span>
          </>
        ) : (
          <span className="hs-now-text">
            <span className="hs-now-title">{t('On your marks…')}</span>
            {!known && <span className="hs-now-sub">{t('First past row {n} wins', { n: race.rows })}</span>}
          </span>
        )}
        <DeckCount left={race.deck.length} />
      </div>

      <div className="sticky-action hs-actions">
        <BigButton size="xl" onClick={go} disabled={!!race.winner}>
          {race.queue.length ? t('Turn the side card') : t('Next card')}
        </BigButton>
        <button type="button" role="switch" aria-checked={auto} className={`hs-auto${auto ? ' on' : ''}`} onClick={() => setAuto(!auto)}>
          {auto ? t('Auto ⏸') : t('Auto ▶')}
        </button>
      </div>
    </div>
  );
}

/** The track: side cards on the left, one lane per Ace, the finish line on top. */
function Track({ race, backers }: { race: Race; backers: (s: Suit) => Player[] }) {
  const rowsTopDown = Array.from({ length: race.rows }, (_, i) => race.rows - i);
  return (
    <div className="hs-track">
      <div className="hs-finish-line" aria-hidden />
      {rowsTopDown.map((row) => {
        const side = race.side[row - 1];
        return (
          <div key={row} className="hs-row" style={{ gridRow: race.rows - row + 2 }}>
            <span className="hs-row-num">{row}</span>
            <span className={`hs-side${side.open ? ' open' : ''}`}>
              {side.open ? <CardFace card={side.card} /> : <span className="pcard-face pcard-back" />}
            </span>
          </div>
        );
      })}
      <div className="hs-start" style={{ gridRow: race.rows + 2 }} />
      {SUITS.map((s, lane) => (
        <span
          key={s}
          className="hs-ace"
          style={
            {
              '--lane': lane,
              // At the start the Ace sits at the top of the start row, above its backers; on the track it's centred in its row.
              top:
                race.pos[s] === 0
                  ? 'calc(var(--rh) * (var(--rows) + 1) + 4px)'
                  : `calc(var(--rh) * (var(--rows) + 1 - ${Math.min(race.pos[s], race.rows + 1)}) + (var(--rh) - var(--cw) * 1.4) / 2)`,
            } as CSSProperties
          }
          aria-label={t('{suit}: row {n}', { suit: t(SUIT_NAME[s]), n: race.pos[s] })}
        >
          <CardFace card={{ value: 14, suit: s }} />
        </span>
      ))}
      <div className="hs-backers" style={{ gridRow: race.rows + 2 }}>
        {SUITS.map((s) => (
          <span key={s} className="hs-backer-lane">
            {backers(s).map((p) => (
              <span key={p.id} className="hs-backer" style={{ background: p.color }} title={p.name}>
                {p.avatar}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
