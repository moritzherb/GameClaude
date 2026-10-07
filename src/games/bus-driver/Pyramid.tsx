import { useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { cardName, rankLabel, type Card } from '../../lib/cards';
import { buzz, sfx } from '../../lib/fx';
import type { Player } from '../../state/AppState';
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
  tipsy: boolean;
  cards: Card[];
  toppedUp: boolean;
  flips: number;
  hands: Card[][];
  /** Per flip: what each seat laid down on it. */
  laid: Card[][][];
  gave: number[];
}

export default function Pyramid({ seats, deck, onDone }: Props) {
  const [rows, setRows] = useState(DEFAULT_PYRAMID_SIZE);
  const [tipsy, setTipsy] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [showResult, setShowResult] = useState(false);
  // Flip index already handled, so a double tap can't flip two cards before React re-renders.
  const handled = useRef(-1);

  /* ---------- Setup ---------- */
  if (!game) {
    const needsTopUp = deck.length < pyramidCardCount(rows);
    const sipsLine = pyramidRows(rows)
      .map((_, r) => rowSips(r, tipsy))
      .join(' – ');
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">Part 2 · The pyramid</span>
          <h2 className="bd-title">Get rid of your cards.</h2>
          <p className="lead">
            We flip the pyramid from the bottom row up. Got the same value? Your card goes on it and you give out sips. Most cards left at the end drives
            the bus.
          </p>
        </div>

        <section className="section">
          <h3 className="section-title">Pyramid size</h3>
          <div className="seg">
            {PYRAMID_SIZES.map((n) => (
              <Tap key={n} className={`seg-btn${n === rows ? ' active' : ''}`} onClick={() => setRows(n)}>
                <span className="seg-main">{n} rows</span>
                <span className="seg-sub">{pyramidCardCount(n)} cards</span>
              </Tap>
            ))}
          </div>
        </section>

        <section className="section">
          <h3 className="section-title">Sips per row</h3>
          <div className="seg two">
            <Tap className={`seg-btn${!tipsy ? ' active' : ''}`} onClick={() => setTipsy(false)}>
              <span className="seg-main">Normal</span>
              <span className="seg-sub">{pyramidRows(rows).map((_, r) => rowSips(r, false)).join('-')}</span>
            </Tap>
            <Tap className={`seg-btn${tipsy ? ' active' : ''}`} onClick={() => setTipsy(true)}>
              <span className="seg-main">Tipsy 🔥</span>
              <span className="seg-sub">{pyramidRows(rows).map((_, r) => rowSips(r, true)).join('-')}</span>
            </Tap>
          </div>
          <p className="fine-print">
            Bottom to top: {sipsLine} sips per card.
            {needsTopUp ? ' Not enough cards left, so a fresh deck gets added.' : ` The other ${deck.length - pyramidCardCount(rows)} cards are put aside.`}
          </p>
        </section>

        <div className="sticky-action">
          <BigButton
            size="xl"
            onClick={() => {
              const { cards, toppedUp } = buildPyramid(deck, rows);
              setGame({ rows, tipsy, cards, toppedUp, flips: 0, hands: seats.map((x) => x.hand), laid: [], gave: seats.map(() => 0) });
            }}
          >
            Lay out the pyramid 🔺
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
    const sips = rowSips(rowOfFlip(game.flips, game.rows), game.tipsy);
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
          <span className="kicker">Pyramid done</span>
          <h2 className="bd-title big">{tie ? 'It’s a tie!' : `${loserNames[0]} drives the bus 🚌`}</h2>
          <p className="lead">
            {tie
              ? `${loserNames.join(' & ')} have ${game.hands[losers[0]].length} card${game.hands[losers[0]].length === 1 ? '' : 's'} left each. Tiebreaker!`
              : `Most cards left: ${game.hands[losers[0]].length}.`}
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
                  {game.hands[i].length} left · 🎁 {game.gave[i]}
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
            {tie ? 'Start the tiebreaker' : 'Continue'}
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
  const lastSips = rowSips(lastRow, game.tipsy);
  const nextRow = rowOfFlip(Math.min(game.flips, total - 1), game.rows);
  // Screen minus gutters, pyramid padding and the two side columns, shared by the bottom row.
  const cardWidth = `clamp(28px, calc((min(100vw, 560px) - 136px - ${(game.rows - 1) * 6}px) / ${game.rows}), 62px)`;

  return (
    <div className="bd">
      <div className="pyramid" style={{ '--cw': cardWidth } as CSSProperties}>
        {[...sizes.keys()].reverse().map((r) => (
          <div key={r} className={`pyramid-row${r === nextRow && !done ? ' current' : ''}`}>
            <span className="pyramid-sips">×{rowSips(r, game.tipsy)}</span>
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
                    aria-label={idx === game.flips ? 'Flip this card' : undefined}
                  >
                    <PlayingCard card={game.cards[idx]} faceUp={idx < game.flips} waiting={idx === game.flips} style={{ '--cw': 'inherit' } as CSSProperties} />
                    {laidCount > 0 && <span className="pyramid-badge">+{laidCount}</span>}
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
              Row {lastRow + 1} · {lastSips} sip{lastSips > 1 ? 's' : ''} per card
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
                      <strong>{seats[i].player.name}</strong> lays {l.map(cardName).join(' + ')} · gives out <strong>{l.length * lastSips}</strong>
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="flip-result-none">
              Nobody has {last.value === 8 || last.value === 14 ? 'an' : 'a'} {rankLabel(last.value)}. 🤷
            </p>
          )}
        </div>
      ) : (
        <p className="lead center">Flip the first card. Bottom row, left to right.</p>
      )}

      <section className="panel hands">
        <h3 className="section-title">Hands</h3>
        {seats.map((x, i) => (
          <div key={x.player.id} className={`hand-row${lastLaid?.[i]?.length ? ' just-laid' : ''}`}>
            <span className="bd-avatar xs" style={{ background: x.player.color }}>
              {x.player.avatar}
            </span>
            <span className="hand-name">{x.player.name}</span>
            <span className="hand-cards">
              {game.hands[i].length ? game.hands[i].map((c, j) => <PlayingCard key={j} card={c} size="sm" />) : <span className="hand-empty">All gone 🎉</span>}
            </span>
          </div>
        ))}
        {game.toppedUp && <p className="fine-print">A fresh deck was added to build the pyramid.</p>}
      </section>

      <div className="sticky-action">
        {done ? (
          <BigButton size="xl" onClick={() => setShowResult(true)}>
            Who drives the bus? 🚌
          </BigButton>
        ) : (
          <BigButton size="xl" variant="light" onClick={flip}>
            Flip card {game.flips + 1} of {total}
          </BigButton>
        )}
      </div>
    </div>
  );
}
