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
/** How long the card in play takes to glide in. */
const FLY_MS = 300;
/** A card that's no use at all goes onto the discard pile by itself after this long. */
const AUTO_TOSS_MS = 800;

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
  // Where the held card comes from, so it can glide from there into the hand spot.
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null);
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
  const from = (el: Element | null) => {
    const r = el?.getBoundingClientRect();
    setFly(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
  };
  const tapStock = (el: Element) => {
    if (g.phase !== 'draw') return;
    sfx.tick();
    buzz(10);
    from(el);
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
    from(el);
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
    from(el);
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
        ? t('No use: onto the discard pile')
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
              onAutoToss={kind === 'toss' ? dropOnDiscard : undefined}
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
 * The card in play. It glides in, face up, from wherever
 * it came from. Drag it onto a slot or the discard pile; if it's dropped anywhere else it slides back.
 */
function HeldCard({
  card,
  useless,
  rotated,
  fly,
  onDrop,
  onAutoToss,
}: {
  card: Card;
  useless: boolean;
  /** The middle is turned around for the player opposite: screen moves are mirrored inside it. */
  rotated: boolean;
  fly: { x: number; y: number } | null;
  onDrop: (target: Element | null) => boolean;
  /** Set for a card that's no use at all: after a moment it slides onto the discard pile by itself. */
  onAutoToss?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const sign = rotated ? -1 : 1;

  // Glide in from where the card came from, already showing its face.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !fly || typeof el.animate !== 'function') return;
    const r = el.getBoundingClientRect();
    const dx = (fly.x - (r.left + r.width / 2)) * sign;
    const dy = (fly.y - (r.top + r.height / 2)) * sign;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(0.92)` }, { transform: 'none' }], {
      duration: FLY_MS,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
    // Only when the card first shows up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No use at all: after a short look, off it goes onto the discard pile (unless you grab it first).
  const autoTimer = useRef<number | undefined>(undefined);
  const tossRef = useRef(onAutoToss);
  tossRef.current = onAutoToss;
  const auto = !!onAutoToss;
  useEffect(() => {
    if (!auto) return;
    autoTimer.current = window.setTimeout(() => {
      const el = ref.current;
      const pile = document.querySelector('[data-drop="discard"]');
      if (!el || !pile || typeof el.animate !== 'function') return tossRef.current?.();
      const a = el.getBoundingClientRect();
      const b = pile.getBoundingClientRect();
      const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) * sign;
      const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) * sign;
      const anim = el.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) rotate(-8deg)` }], {
        duration: 260,
        easing: 'ease-in',
        fill: 'forwards',
      });
      anim.onfinish = () => tossRef.current?.();
    }, AUTO_TOSS_MS);
    return () => window.clearTimeout(autoTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const down = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    window.clearTimeout(autoTimer.current);
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
      className={`tr-hand-card${useless ? ' useless' : ''}${drag ? ' dragging' : ''}${fly ? ' gliding' : ''}`}
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
    </span>
  );
}
