import { useEffect, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { rankLabel } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { draw, newGame, nextRound, place, slotFor, takeDiscard, toss, usable, type Game, type Who } from './logic';

/** Numbers go into their slot by themselves after this pause; a useless card is tossed after the longer one. */
const PLACE_MS = 650;
const TOSS_MS = 1100;
const SLOT_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function Trash({ players, exit }: GameProps) {
  const known = useApp().knows('trash');
  const [pair, setPair] = useState<string[]>(() => players.slice(0, 2).map((p) => p.id));
  const [dealer, setDealer] = useState<Who>(() => pick([0, 1] as Who[]));
  const [g, setG] = useState<Game | null>(null);
  const [nope, setNope] = useState(0);
  const two = pair.map((id) => players.find((p) => p.id === id)).filter((p): p is Player => !!p);

  // Play the held card on its own: numbers into their slot, useless cards onto the discard pile.
  // A Jack waits for a tap on the slot you want.
  const hand = g?.hand;
  const auto = g && hand && g.phase === 'place' ? (!usable(g, g.turn, hand) ? 'toss' : slotFor(hand) === 'wild' ? null : 'place') : null;
  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(
      () => {
        if (auto === 'place') {
          sfx.pop();
          buzz(12);
          setG((x) => (x ? place(x) : x));
        } else {
          sfx.boo();
          buzz([40, 30, 40]);
          setG((x) => (x ? toss(x) : x));
        }
      },
      auto === 'place' ? PLACE_MS : TOSS_MS,
    );
    return () => window.clearTimeout(id);
  }, [auto, hand, g?.sides]);

  const phase = g?.phase;
  useEffect(() => {
    if (phase === 'round-over' || phase === 'game-over') celebrate();
  }, [phase]);

  /* ---------- Setup ---------- */
  if (!g || two.length < 2) {
    const toggle = (id: string) => setPair((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{players.length > 2 ? t('Who plays?') : t('Who deals first?')}</h2>
          {!known && <p className="lead">{t('A duel for two. Put the phone between you: the top half is for the player opposite.')}</p>}
        </div>
        {players.length > 2 && (
          <div className="pick-grid">
            {players.map((p) => (
              <Tap
                key={p.id}
                className={`pick-chip${pair.includes(p.id) ? ' selected' : ''}`}
                style={{ '--chip': p.color } as CSSProperties}
                onClick={() => toggle(p.id)}
              >
                <span className="pick-chip-avatar">{p.avatar}</span>
                <span className="pick-chip-name">{p.name}</span>
              </Tap>
            ))}
          </div>
        )}
        {two.length === 2 && (
          <>
            {players.length > 2 && <h3 className="section-title">{t('Who deals first?')}</h3>}
            <div className="seg two">
              {two.map((p, i) => (
                <button key={p.id} type="button" className={`seg-btn${dealer === i ? ' active' : ''}`} onClick={() => setDealer(i as Who)}>
                  <span className="seg-main">{p.name}</span>
                  <span className="seg-sub">{dealer === i ? 'Dealer' : t('starts')}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="sticky-action">
          <BigButton size="xl" disabled={two.length < 2} onClick={() => setG(newGame(dealer))}>
            {two.length < 2 ? t('Pick two players') : t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  const me = two[g.turn];
  const tapStock = () => {
    if (g.phase !== 'draw') return;
    sfx.tick();
    buzz(10);
    setG(draw(g));
  };
  const tapDiscard = () => {
    if (g.phase !== 'draw' || !g.discard.length) return;
    const next = takeDiscard(g);
    if (next === g) {
      buzz([30, 30, 30]);
      setNope((n) => n + 1);
      return;
    }
    sfx.tick();
    setG(next);
  };
  const tapSlot = (who: Who, i: number) => {
    if (who !== g.turn || !hand || slotFor(hand) !== 'wild') return;
    const next = place(g, i);
    if (next === g) return;
    sfx.pop();
    buzz(12);
    setG(next);
  };

  const status =
    g.phase === 'draw'
      ? t('{name}: draw a card', { name: me.name })
      : hand && auto === 'toss'
        ? t('No use: onto the discard pile')
        : hand && slotFor(hand) === 'wild'
          ? t('Jack! Tap any face-down slot')
          : t('{name} plays on…', { name: me.name });

  const over = g.phase === 'round-over' || g.phase === 'game-over';

  return (
    <div className="tr fill">
      <Board g={g} who={1} player={two[1]} flipped onSlot={(i) => tapSlot(1, i)} />

      <div className={`tr-middle${g.turn === 1 ? ' flipped' : ''}`}>
        <button type="button" className={`tr-stock${g.phase === 'draw' ? ' ready' : ''}`} onClick={tapStock} aria-label={t('Draw a card')}>
          <span className="tr-count">{g.stock.length}</span>
        </button>
        <button
          type="button"
          key={nope}
          className={`tr-discard${nope ? ' nope' : ''}`}
          onClick={tapDiscard}
          aria-label={t('Take the discard')}
        >
          {g.discard.length ? <CardFace card={g.discard[g.discard.length - 1]} /> : <span className="tr-empty" />}
        </button>
        <span className="tr-hand">
          {hand ? (
            <span className={`tr-hand-card${auto === 'toss' ? ' useless' : ''}`} key={`${hand.value}${hand.suit}`}>
              <CardFace card={hand} />
            </span>
          ) : (
            <span className="tr-empty" />
          )}
        </span>
        <span className="tr-status">
          <span className="tr-status-name" style={{ color: me.color }}>
            {me.avatar}
          </span>
          <span className="tr-status-text">{status}</span>
          {!known && g.phase === 'draw' && g.round === 1 && g.discard.length === 0 && (
            <span className="tr-status-hint">{t('Tap the stock. Or the discard pile, if you can use its card.')}</span>
          )}
        </span>
      </div>

      <Board g={g} who={0} player={two[0]} onSlot={(i) => tapSlot(0, i)} />

      {over && g.winner != null && (
        <div className="tr-over">
          <div className="tr-over-card">
            <span className="kicker">{g.phase === 'game-over' ? t('Game over') : t('Round {n}', { n: g.round })}</span>
            <h2 className="bd-title big">
              {g.phase === 'game-over' ? t('{name} wins the game!', { name: two[g.winner].name }) : t('{name} wins the round!', { name: two[g.winner].name })}
            </h2>
            {g.phase === 'round-over' && (
              <p className="lead">
                {t('Next round: {a} plays {x} cards, {b} plays {y}.', {
                  a: two[g.winner].name,
                  x: g.sizes[g.winner] - 1,
                  b: two[g.winner === 0 ? 1 : 0].name,
                  y: g.sizes[g.winner === 0 ? 1 : 0],
                })}
              </p>
            )}
            {g.phase === 'round-over' ? (
              <BigButton size="xl" onClick={() => setG(nextRound(g))}>
                {t('Next round')}
              </BigButton>
            ) : (
              <>
                <BigButton onClick={() => setG(null)}>{t('Play again')}</BigButton>
                <BigButton variant="glass" onClick={exit}>
                  {t('Back to games')}
                </BigButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** One player's ten slots, A–5 on top and 6–10 below; the player opposite sees theirs upside down. */
function Board({ g, who, player, flipped, onSlot }: { g: Game; who: Who; player: Player; flipped?: boolean; onSlot: (i: number) => void }) {
  const slots = g.sides[who];
  const active = g.turn === who && !(g.phase === 'round-over' || g.phase === 'game-over');
  const hand = active ? g.hand : null;
  const wild = hand && slotFor(hand) === 'wild';
  const target = hand && !wild && usable(g, who, hand) ? (slotFor(hand) as number) : null;
  const up = slots.filter((s) => s.up).length;
  return (
    <section className={`tr-board${flipped ? ' flipped' : ''}${active ? ' active' : ''}`}>
      <div className="tr-board-head">
        <span className="bd-avatar xs" style={{ background: player.color }}>
          {player.avatar}
        </span>
        <span className="tr-board-name">{player.name}</span>
        <span className="tr-board-count">
          {up}/{slots.length}
        </span>
        {g.dealer === who && <span className="tr-dealer">Dealer</span>}
      </div>
      <div className="tr-slots">
        {SLOT_LABELS.map((label, i) => {
          const s = slots[i];
          if (!s) return <span key={i} className="tr-slot gone" />;
          return (
            <button
              key={i}
              type="button"
              className={`tr-slot${s.up ? ' up' : ''}${target === i ? ' target' : ''}${wild && !s.up ? ' pickable' : ''}`}
              disabled={!(wild && !s.up)}
              onClick={() => onSlot(i)}
              aria-label={s.up ? `${label}: ${rankLabel(s.card.value)}` : label}
            >
              {s.up ? <CardFace card={s.card} /> : <span className="pcard-face pcard-back" />}
              {!s.up && <span className="tr-slot-label">{label}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
