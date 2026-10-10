import { useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { cardName, rankLabel, type Card } from '../../lib/cards';
import { buzz, sfx } from '../../lib/fx';
import { useApp, type Player } from '../../state/AppState';
import {
  buildPyramid,
  DEFAULT_PYRAMID_SIZE,
  layMatches,
  mostCards,
  PYRAMID_SIZES,
  pyramidCardCount,
  pyramidRows,
  rowOfFlip,
  rowSips,
  SIP_MODES,
  type SipMode,
} from './pyramid';

export interface PyramidSeat {
  player: Player;
  hand: Card[];
}

interface Props {
  seats: PyramidSeat[];
  /** What's left of the deck after part 1. */
  deck: Card[];
  /** Called with the seat(s) holding the most cards: one = bus driver, more = tiebreaker. */
  onDone: (losers: Player[]) => void;
}

interface Game {
  rows: number;
  sipMode: SipMode;
  cards: Card[];
  toppedUp: boolean;
  flips: number;
  hands: Card[][];
  /** Per flip: what each seat laid down on it. */
  laid: Card[][][];
  gave: number[];
}

/** Tiny card backs laid out like the real pyramid, for the size picker. */
function MiniPyramid({ rows }: { rows: number }) {
  return (
    <span className="mini-pyramid" aria-hidden>
      {[...pyramidRows(rows)].reverse().map((size, r) => (
        <span key={r} className="mini-pyramid-row">
          {Array.from({ length: size }, (_, k) => (
            <i key={k} />
          ))}
        </span>
      ))}
    </span>
  );
}

export default function Pyramid({ seats, deck, onDone }: Props) {
  const known = useApp().knows('bus-driver');
  const [rows, setRows] = useState(DEFAULT_PYRAMID_SIZE);
  const [sipMode, setSipMode] = useState<SipMode>('normal');
  const [game, setGame] = useState<Game | null>(null);
  const [showResult, setShowResult] = useState(false);
  // Flip index already handled, so a double tap can't flip two cards before React re-renders.
  const handled = useRef(-1);

  /* ---------- Setup ---------- */
  if (!game) {
    const needsTopUp = deck.length < pyramidCardCount(rows);
    const sipsLine = pyramidRows(rows)
      .map((_, r) => rowSips(r, sipMode))
      .join(' – ');
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('Part 2 · The pyramid')}</span>
          <h2 className="bd-title">{t('Get rid of your cards.')}</h2>
          {!known && (
            <p className="lead">
              {t(
                'We flip the pyramid from the bottom row up. Got the same value? Your card goes on it and you give out sips. Whoever has the most cards left at the end drives the bus.',
              )}
            </p>
          )}
        </div>

        <section className="section">
          <h3 className="section-title">{t('Pyramid size')}</h3>
          <div className="seg">
            {PYRAMID_SIZES.map((n) => (
              <Tap key={n} className={`seg-btn size-btn${n === rows ? ' active' : ''}`} onClick={() => setRows(n)} ariaLabel={t('{rows} rows, {cards} cards', { rows: n, cards: pyramidCardCount(n) })}>
                <MiniPyramid rows={n} />
                <span className="seg-sub">{t('{n} cards', { n: pyramidCardCount(n) })}</span>
              </Tap>
            ))}
          </div>
        </section>

        <section className="section">
          <h3 className="section-title">{t('Sips per row')}</h3>
          <div className="seg three">
            {SIP_MODES.map((m) => (
              <Tap key={m.id} className={`seg-btn${m.id === sipMode ? ' active' : ''}`} onClick={() => setSipMode(m.id)}>
                <span className="seg-main">{t(m.label)}</span>
                <span className="seg-sub">{pyramidRows(rows).map((_, r) => rowSips(r, m.id)).join('-')}</span>
              </Tap>
            ))}
          </div>
          <p className="fine-print">
            {t('Bottom to top: {sips} sips per card.', { sips: sipsLine })}{' '}
            {needsTopUp
              ? t('Not enough cards left, so a second deck fills the gap (no card twice in the pyramid).')
              : t('The other {n} cards are put aside.', { n: deck.length - pyramidCardCount(rows) })}
          </p>
        </section>

        <div className="sticky-action">
          <BigButton
            size="xl"
            onClick={() => {
              const { cards, toppedUp } = buildPyramid(deck, rows);
              setGame({ rows, sipMode, cards, toppedUp, flips: 0, hands: seats.map((x) => x.hand), laid: [], gave: seats.map(() => 0) });
            }}
          >
            {t('Lay out the pyramid')}
          </BigButton>
        </div>
      </div>
    );
  }

  const total = game.cards.length;
  const done = game.flips >= total;

  const flip = () => {
    if (done || handled.current === game.flips) return;
    handled.current = game.flips;
    const card = game.cards[game.flips];
    const sips = rowSips(rowOfFlip(game.flips, game.rows), game.sipMode);
    const { laid, left } = layMatches(game.hands, card);
    setGame({
      ...game,
      flips: game.flips + 1,
      hands: left,
      laid: [...game.laid, laid],
      gave: game.gave.map((g, i) => g + laid[i].length * sips),
    });
    window.setTimeout(() => {
      if (laid.some((l) => l.length)) {
        sfx.tada();
        buzz([30, 40, 30]);
      } else sfx.tick();
    }, 450);
  };

  /* ---------- Result: who has the most cards left ---------- */
  if (showResult) {
    const losers = mostCards(game.hands);
    const order = seats.map((_, i) => i).sort((a, b) => game.hands[b].length - game.hands[a].length);
    const tie = losers.length > 1;
    const loserNames = losers.map((i) => seats[i].player.name);
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('Pyramid done')}</span>
          <h2 className="bd-title big">{tie ? t('It’s a tie!') : t('{name} drives the bus', { name: loserNames[0] })}</h2>
          <p className="lead">
            {tie
              ? game.hands[losers[0]].length === 1
                ? t('{names} have {n} card left each. Tiebreaker!', { names: loserNames.join(' & '), n: 1 })
                : t('{names} have {n} cards left each. Tiebreaker!', { names: loserNames.join(' & '), n: game.hands[losers[0]].length })
              : t('Most cards left: {n}.', { n: game.hands[losers[0]].length })}
          </p>
        </div>

        <div className="bd-summary">
          {order.map((i) => (
            <div key={seats[i].player.id} className={`bd-summary-row${losers.includes(i) ? ' loser' : ''}`}>
              <div className="bd-summary-who">
                <span className="bd-avatar sm" style={{ background: seats[i].player.color }}>
                  {seats[i].player.avatar}
                </span>
                <span className="bd-summary-name">{seats[i].player.name}</span>
                <span className="bd-summary-stats">
                  {t('{n} left · gave {gave}', { n: game.hands[i].length, gave: game.gave[i] })}
                </span>
              </div>
              {game.hands[i].length > 0 && (
                <div className="bd-summary-hand">
                  {game.hands[i].map((c, j) => (
                    <PlayingCard key={j} card={c} size="sm" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sticky-action">
          <BigButton size="xl" onClick={() => onDone(losers.map((i) => seats[i].player))}>
            {tie ? t('Start the tiebreaker') : t('Continue')}
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------- Flipping the pyramid ---------- */
  const sizes = pyramidRows(game.rows);
  const starts = sizes.map((_, r) => sizes.slice(0, r).reduce((a, b) => a + b, 0));
  const lastIndex = game.flips - 1;
  const last = lastIndex >= 0 ? game.cards[lastIndex] : null;
  const lastLaid = lastIndex >= 0 ? game.laid[lastIndex] : null;
  const lastRow = lastIndex >= 0 ? rowOfFlip(lastIndex, game.rows) : 0;
  const lastSips = rowSips(lastRow, game.sipMode);
  const nextRow = rowOfFlip(Math.min(game.flips, total - 1), game.rows);
  // Screen minus gutters, pyramid padding and the two side columns, shared by the bottom row.
  const cardWidth = `clamp(28px, calc((min(100vw, 560px) - 136px - ${(game.rows - 1) * 6}px) / ${game.rows}), 62px)`;

  return (
    <div className="bd">
      <div className="pyramid" style={{ '--cw': cardWidth } as CSSProperties}>
        {[...sizes.keys()].reverse().map((r) => (
          <div key={r} className={`pyramid-row${r === nextRow && !done ? ' current' : ''}`}>
            <span className="pyramid-sips">×{rowSips(r, game.sipMode)}</span>
            <div className="pyramid-cards">
              {Array.from({ length: sizes[r] }, (_, k) => {
                const idx = starts[r] + k;
                const laidCount = game.laid[idx]?.reduce((n, l) => n + l.length, 0) ?? 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="pyramid-slot"
                    disabled={idx !== game.flips}
                    onClick={flip}
                    aria-label={idx === game.flips ? t('Flip this card') : undefined}
                  >
                    <PlayingCard card={game.cards[idx]} faceUp={idx < game.flips} waiting={idx === game.flips} style={{ '--cw': 'inherit' } as CSSProperties} />
                    {laidCount > 0 && <span className="pyramid-badge">{laidCount}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {last && lastLaid ? (
        <div key={lastIndex} className={`flip-result${lastLaid.some((l) => l.length) ? ' hit' : ''}`}>
          <div className="flip-result-head">
            <span className="flip-result-card">{cardName(last)}</span>
            <span className="flip-result-row">
              {lastSips === 1
                ? t('Row {row} · {n} sip per card', { row: lastRow + 1, n: lastSips })
                : t('Row {row} · {n} sips per card', { row: lastRow + 1, n: lastSips })}
            </span>
          </div>
          {lastLaid.some((l) => l.length) ? (
            <ul className="flip-result-list">
              {lastLaid.map((l, i) =>
                l.length ? (
                  <li key={seats[i].player.id}>
                    <span className="bd-avatar xs" style={{ background: seats[i].player.color }}>
                      {seats[i].player.avatar}
                    </span>
                    <span>
                      <strong>{seats[i].player.name}</strong> {t('lays {cards}', { cards: l.map(cardName).join(' + ') })} · {t('gives out')}{' '}
                      <strong>{l.length * lastSips}</strong>
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="flip-result-none">
              {last.value === 8 || last.value === 14
                ? t('Nobody has an {rank}.', { rank: rankLabel(last.value) })
                : t('Nobody has a {rank}.', { rank: rankLabel(last.value) })}
            </p>
          )}
        </div>
      ) : (
        !known && <p className="lead center">{t('Flip the first card. Bottom row, left to right.')}</p>
      )}

      <section className="panel hands">
        <h3 className="section-title">{t('Hands')}</h3>
        {seats.map((x, i) => (
          <div key={x.player.id} className={`hand-row${lastLaid?.[i]?.length ? ' just-laid' : ''}`}>
            <span className="bd-avatar xs" style={{ background: x.player.color }}>
              {x.player.avatar}
            </span>
            <span className="hand-name">{x.player.name}</span>
            <span className="hand-cards">
              {game.hands[i].length ? game.hands[i].map((c, j) => <PlayingCard key={j} card={c} size="sm" />) : <span className="hand-empty">{t('All gone 🎉')}</span>}
            </span>
          </div>
        ))}
        {game.toppedUp && <p className="fine-print">{t('A fresh deck was added to build the pyramid.')}</p>}
      </section>

      <div className="sticky-action">
        {done ? (
          <BigButton size="xl" onClick={() => setShowResult(true)}>
            {t('Who drives the bus?')}
          </BigButton>
        ) : (
          <BigButton size="xl" variant="light" onClick={flip}>
            {t('Flip card {n} of {total}', { n: game.flips + 1, total })}
          </BigButton>
        )}
      </div>
    </div>
  );
}
