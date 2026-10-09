import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { rankLabel, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { draw, fitsDown, newGame, nextRound, place, slotFor, swapsJack, takeDiscard, toss, usable, type Game, type Who } from './logic';

const SLOT_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function Trash({ players, exit }: GameProps) {
  const known = useApp().knows('trash');
  const [pair, setPair] = useState<string[]>(() => players.slice(0, 2).map((p) => p.id));
  const [dealer, setDealer] = useState<Who>(() => pick([0, 1] as Who[]));
  const [g, setG] = useState<Game | null>(null);
  const [nope, setNope] = useState(0);
  const two = pair.map((id) => players.find((p) => p.id === id)).filter((p): p is Player => !!p);

  // What the held card is good for: its own face-down slot, any face-down slot (a Jack), swapping out
  // a Jack that lies in its slot, or nothing (onto the discard pile). The player moves it there:
  // drag it (or tap the spot).
  const hand = g?.hand;
  const kind =
    g && hand && g.phase === 'place'
      ? fitsDown(g, g.turn, hand)
        ? slotFor(hand) === 'wild'
          ? 'wild'
          : 'place'
        : swapsJack(g, g.turn, hand)
          ? 'swap'
          : 'toss'
      : null;
  // Where the held card comes from, so it can fly (and flip) from there into the hand spot.
  const [fly, setFly] = useState<{ x: number; y: number; flip: boolean } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 1800);
    return () => window.clearTimeout(id);
  }, [msg]);

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
  const from = (el: Element | null, flip: boolean) => {
    const r = el?.getBoundingClientRect();
    setFly(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, flip } : null);
  };
  const tapStock = (el: Element) => {
    if (g.phase !== 'draw') return;
    sfx.tick();
    buzz(10);
    from(el, true);
    setG(draw(g));
  };
  const tapDiscard = (el: Element) => {
    if (g.phase === 'place') {
      dropOnDiscard();
      return;
    }
    if (g.phase !== 'draw' || !g.discard.length) return;
    const next = takeDiscard(g);
    if (next === g) {
      buzz([30, 30, 30]);
      setNope((n) => n + 1);
      setMsg(t('You can only take it if you can use it'));
      return;
    }
    sfx.tick();
    from(el, false);
    setG(next);
  };
  const miss = (text: string) => {
    buzz([30, 30, 30]);
    setMsg(text);
    return false;
  };
  /** The held card dropped (or tapped) onto a slot. Returns whether it went in. */
  const dropOnSlot = (who: Who, i: number, el: Element | null) => {
    if (g.phase !== 'place' || !hand) return false;
    if (who !== g.turn) return miss(t('That’s not your side'));
    if (kind === 'toss') return miss(t('No use: drag it onto the discard pile'));
    const slot = g.sides[who][i];
    if (!slot) return false;
    if (kind !== 'wild' && i !== slotFor(hand)) return miss(t('Not there: this card goes into slot {slot}', { slot: SLOT_LABELS[slotFor(hand) as number] }));
    if (slot.up && kind !== 'swap') return miss(t('That one is already face up'));
    const next = kind === 'wild' ? place(g, i) : place(g);
    if (next === g) return false;
    sfx.pop();
    buzz(12);
    // The card that lay there comes up into the hand spot: turning over, or the swapped-out Jack.
    from(el, kind !== 'swap');
    setMsg(null);
    setG(next);
    return true;
  };
  const dropOnDiscard = () => {
    if (g.phase !== 'place' || !hand) return false;
    if (kind !== 'toss' && kind !== 'swap') return miss(t('You can still use this card'));
    sfx.boo();
    buzz([40, 30, 40]);
    setFly(null);
    setMsg(null);
    setG(toss(g));
    return true;
  };

  const status =
    g.phase === 'draw'
      ? t('{name}: draw a card', { name: me.name })
      : kind === 'toss'
        ? t('No use: drag it onto the discard pile')
        : kind === 'swap'
          ? t('Swap it for your Jack, or drag it onto the discard pile')
          : kind === 'wild'
            ? t('Jack! Drag it onto any face-down slot')
            : t('Drag the card onto its slot');

  const over = g.phase === 'round-over' || g.phase === 'game-over';

  return (
    <div className="tr fill">
      <Board g={g} who={1} player={two[1]} flipped hint={!known} onSlot={(i, el) => dropOnSlot(1, i, el)} />

      <div className={`tr-middle${g.turn === 1 ? ' flipped' : ''}`}>
        <button
          type="button"
          className={`tr-stock${g.phase === 'draw' ? ' ready' : ''}`}
          onClick={(e) => tapStock(e.currentTarget)}
          aria-label={t('Draw a card')}
        >
          <span className="tr-count">{g.stock.length}</span>
        </button>
        <button
          type="button"
          key={nope}
          data-drop="discard"
          className={`tr-discard${nope ? ' nope' : ''}${kind === 'toss' || kind === 'swap' ? ' drop-here' : ''}`}
          onClick={(e) => tapDiscard(e.currentTarget)}
          aria-label={g.phase === 'place' ? t('Discard pile') : t('Take the discard')}
        >
          {g.discard.length ? <CardFace card={g.discard[g.discard.length - 1]} /> : <span className="tr-empty" />}
        </button>
        <span className="tr-hand">
          {hand ? (
            <HeldCard
              key={`${g.turn}${hand.value}${hand.suit}${g.discard.length}${g.stock.length}`}
              card={hand}
              useless={kind === 'toss'}
              rotated={g.turn === 1}
              fly={fly}
              onDrop={(target) => {
                const drop = target?.closest<HTMLElement>('[data-drop]');
                if (!drop) return false;
                if (drop.dataset.drop === 'discard') return dropOnDiscard();
                const [, who, i] = (drop.dataset.drop ?? '').split(':');
                return dropOnSlot(Number(who) as Who, Number(i), drop);
              }}
            />
          ) : (
            <span className="tr-empty" />
          )}
        </span>
        <span className="tr-status">
          <span className="tr-status-name" style={{ color: me.color }}>
            {me.avatar}
          </span>
          <span className="tr-status-text">{status}</span>
          {msg ? (
            <span key={msg} className="tr-status-hint warn">
              {msg}
            </span>
          ) : (
            !known &&
            g.phase === 'draw' &&
            g.round === 1 &&
            g.discard.length === 0 && <span className="tr-status-hint">{t('Tap the stock. Or the discard pile, if you can use its card.')}</span>
          )}
        </span>
      </div>

      <Board g={g} who={0} player={two[0]} hint={!known} onSlot={(i, el) => dropOnSlot(0, i, el)} />

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
function Board({
  g,
  who,
  player,
  flipped,
  hint,
  onSlot,
}: {
  g: Game;
  who: Who;
  player: Player;
  flipped?: boolean;
  /** Show where the held card goes (for groups that don't know the game yet). */
  hint?: boolean;
  onSlot: (i: number, el: Element) => void;
}) {
  const slots = g.sides[who];
  const active = g.turn === who && !(g.phase === 'round-over' || g.phase === 'game-over');
  const hand = active && g.phase === 'place' ? g.hand : null;
  const wild = hand && slotFor(hand) === 'wild' && usable(g, who, hand);
  const target = hint && hand && !wild && usable(g, who, hand) ? (slotFor(hand) as number) : null;
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
              data-drop={`slot:${who}:${i}`}
              className={`tr-slot${s.up ? ' up' : ''}${target === i ? ' target' : ''}${wild && hint && !s.up ? ' pickable' : ''}`}
              onClick={(e) => hand && onSlot(i, e.currentTarget)}
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

/**
 * The card in play. It arrives with a little flight (and a flip, when it was face down) from wherever
 * it came from. Drag it onto a slot or the discard pile; if it's dropped anywhere else it slides back.
 */
function HeldCard({
  card,
  useless,
  rotated,
  fly,
  onDrop,
}: {
  card: Card;
  useless: boolean;
  /** The middle is turned around for the player opposite: screen moves are mirrored inside it. */
  rotated: boolean;
  fly: { x: number; y: number; flip: boolean } | null;
  onDrop: (target: Element | null) => boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLSpanElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [back, setBack] = useState(false);
  const sign = rotated ? -1 : 1;

  // Fly in from where the card came from, flipping over on the way if it was face down.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !fly || typeof el.animate !== 'function') return;
    const r = el.getBoundingClientRect();
    const dx = (fly.x - (r.left + r.width / 2)) * sign;
    const dy = (fly.y - (r.top + r.height / 2)) * sign;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    const mid = `translate(${dx * 0.45}px, ${dy * 0.45 - 30}px) scale(1.18)`;
    el.animate(
      fly.flip
        ? [
            { transform: `translate(${dx}px, ${dy}px) scaleX(1)` },
            { transform: `${mid} scaleX(0)`, offset: 0.45 },
            { transform: 'none' },
          ]
        : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: mid, offset: 0.5 }, { transform: 'none' }],
      { duration: fly.flip ? 620 : 420, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)' },
    );
    if (fly.flip && backRef.current) {
      backRef.current.animate([{ opacity: 1 }, { opacity: 1, offset: 0.44 }, { opacity: 0, offset: 0.46 }, { opacity: 0 }], { duration: 620 });
    }
    // Only when the card first shows up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBack(!!fly?.flip);
    const id = window.setTimeout(() => setBack(false), 620);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const down = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    // No text selection or native drag-and-drop: either would cancel this drag.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setDrag({ dx: 0, dy: 0 });
  };
  const move = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    setDrag({ dx: (e.clientX - s.x) * sign, dy: (e.clientY - s.y) * sign });
  };
  const up = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12;
    // Whatever lies under the finger, below the card itself.
    const under = moved ? document.elementsFromPoint(e.clientX, e.clientY).find((el) => !ref.current?.contains(el)) ?? null : null;
    if (!moved || !onDrop(under)) setDrag(null); // slides back
  };

  return (
    <span
      ref={ref}
      className={`tr-hand-card${useless ? ' useless' : ''}${drag ? ' dragging' : ''}`}
      style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.08) rotate(${drag.dx * 0.03}deg)` } : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null;
        setDrag(null);
      }}
    >
      <CardFace card={card} />
      {back && <span ref={backRef} className="pcard-face pcard-back" />}
    </span>
  );
}
