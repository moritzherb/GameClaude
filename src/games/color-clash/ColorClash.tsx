import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useYourTurn } from '../../lib/turn';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import HandFan, { SortButton } from '../../components/HandFan';
import Sheet from '../../components/Sheet';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { sortByColour, useSortedHand } from '../../lib/handSort';
import { flyIn, reducedMotion, seatArc } from '../../lib/cardFly';
import { useCardDrag } from '../../lib/useCardDrag';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import {
  callLast,
  COLORS,
  draw,
  MAX_PLAYERS,
  MIN_PLAYERS,
  newGame,
  pass,
  play,
  playable,
  take,
  type Card,
  type Color,
  type Entry,
  type Game,
} from './logic';

interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Shared {
  g: Game | null;
  seats: Seat[];
}

/** English; render with t(). */
export const COLOR_NAME: Record<Color, string> = { crimson: tx('Crimson'), azure: tx('Azure'), amber: tx('Amber'), jade: tx('Jade') };
const KIND_NAME: Record<Card['kind'], string> = {
  number: '',
  block: tx('Block'),
  turnaround: tx('Turnaround'),
  burden: tx('Burden'),
  spectrum: tx('Choose colour'),
  overload: tx('Overload'),
};
const LABEL: Partial<Record<Card['kind'], string>> = { block: '⊘', turnaround: '⇄', burden: '+2', overload: '+4' };

/** Color Clash: every player on their own phone, their hand at the bottom. */
export default function ColorClash() {
  const { state, set, room, isHost, myId } = useShared<Shared>('clash', { g: null, seats: [] });
  const known = useApp().knows('color-clash');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[] | null>(null);

  if (!state.g || state.seats.length < MIN_PLAYERS) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <h2 className="bd-title">{t('Color Clash')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to deal…', { name: host.name }) : t('Waiting for the host to deal…')}</p>
          </div>
        </div>
      );
    }
    const chosen = (picked ?? online.slice(0, MAX_PLAYERS).map((m) => m.id)).filter((id) => online.some((m) => m.id === id));
    const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-MAX_PLAYERS));
    const seats: Seat[] = online.filter((m) => chosen.includes(m.id)).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }));
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('2 to 10 players, 7 cards each')}</span>
          <h2 className="bd-title big">{t('Color Clash')}</h2>
          {!known && <p className="lead">{t('Match the colour, the number or the action. First one out of cards wins.')}</p>}
        </div>
        <div className="cc-sample" aria-hidden>
          {COLORS.map((c, i) => (
            <CardFace key={c} card={{ id: -1 - i, color: c, kind: 'number', value: 7 }} />
          ))}
        </div>
        <h3 className="section-title">{t('Who plays?')}</h3>
        <div className="pick-grid">
          {online.map((m) => (
            <Tap key={m.id} className={`pick-chip${chosen.includes(m.id) ? ' selected' : ''}`} style={{ '--chip': m.color } as CSSProperties} onClick={() => toggle(m.id)}>
              <span className="pick-chip-avatar">
                <Avatar avatar={m.avatar} photo={m.photo} />
              </span>
              <span className="pick-chip-name">{m.name}</span>
            </Tap>
          ))}
        </div>
        <div className="sticky-action">
          <BigButton size="xl" disabled={seats.length < MIN_PLAYERS} onClick={() => set({ g: newGame(seats.length), seats })}>
            {seats.length < MIN_PLAYERS ? t('At least 2 players') : t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  const me = state.seats.findIndex((s) => s.id === myId);
  const photoOf = (id: string) => room.members.find((m) => m.id === id)?.photo;
  return (
    <Table
      g={state.g}
      seats={state.seats}
      me={me}
      photoOf={photoOf}
      isHost={isHost}
      act={(next) => set((s) => (s.g ? { ...s, g: next(s.g) } : s))}
      onNewGame={() => set((s) => ({ ...s, g: null }))}
    />
  );
}

function Table({
  g,
  seats,
  me,
  photoOf,
  isHost,
  act,
  onNewGame,
}: {
  g: Game;
  seats: Seat[];
  me: number;
  photoOf: (id: string) => string | undefined;
  isHost: boolean;
  act: (next: (g: Game) => Game) => void;
  onNewGame: () => void;
}) {
  const [wild, setWild] = useState<Card | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [browse, setBrowse] = useState(false);
  const [sorted, toggleSort] = useSortedHand();
  const table = useRef<HTMLDivElement>(null);
  const size = useSize(table);
  // Where the card you just played was (in your hand, or where you let go of it): it flies from there.
  const launch = useRef<{ rect: DOMRect; at: number } | null>(null);
  const name = (i: number) => seats[i]?.name ?? t('Someone');
  const hand = me >= 0 ? g.hands[me] : [];
  const shown = sorted ? sortByColour(hand, (c) => c.color, worth, COLORS) : hand;
  const playing = g.winner == null;
  const myTurn = me >= 0 && g.turn === me && playing;
  useYourTurn(myTurn);
  const canPlay = (c: Card) => myTurn && playable(g, me, c);
  const anyFits = myTurn && hand.some((c) => playable(g, me, c));
  // Nothing to play: the deck is where to go (it says so, gently, until you do).
  const mustDraw = myTurn && !g.penalty && g.drawn == null && !anyFits;
  const mustTake = myTurn && !!g.penalty && !anyFits;
  const canCall = me >= 0 && g.lastCard?.seat === me && !g.lastCard.called && playing;
  const picked = sel != null ? hand.find((c) => c.id === sel && canPlay(c)) : undefined;
  const big = hand.length > 8;

  // Your hand shrinks back below a browse's worth: the fan again.
  useEffect(() => {
    if (!big) setBrowse(false);
  }, [big]);

  // Every move once on every phone: the card played flies onto the pile, the cards drawn fly from
  // the deck to whoever draws them, a word pops up for the rest.
  const [toast, setToast] = useState<{ key: number; text: string; tone: 'good' | 'bad' | 'plain' } | null>(null);
  const seen = useRef(g.seq);
  const topRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (g.seq === seen.current) return;
    seen.current = g.seq;
    const box = table.current;
    if (!box) return;
    const seatDeck = (i: number) => (i === me ? document.querySelector('.cc-hand') : box.querySelector(`[data-seat="${i}"] .cc-seat-deck`));
    const deck = box.querySelector('.cc-deck-stack');
    let delay = 0;
    for (const e of g.events) {
      if (e.k === 'play') {
        const el = topRef.current;
        const from = e.by === me && launch.current && performance.now() - launch.current.at < 4000 ? launch.current.rect : seatDeck(e.by)?.getBoundingClientRect();
        launch.current = null;
        if (el && from) flyIn(el, from);
        sfx.pop();
      } else if (e.k === 'draw' || e.k === 'take' || e.k === 'forgot') {
        const to = seatDeck(e.by)?.getBoundingClientRect();
        if (deck && to) delay = flyBacks(deck.getBoundingClientRect(), to, e.n, delay);
      }
    }
    const last = [...g.events].reverse().find((e) => e.k !== 'play' && e.k !== 'draw');
    if (last) setToast({ key: g.seq, text: toastText(last, name, me), tone: last.k === 'called' ? 'good' : last.k === 'forgot' ? 'bad' : 'plain' });
    if (g.events.some((e) => e.k === 'forgot' && e.by === me)) buzz([20, 40, 20]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.seq]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (g.winner != null) {
    return (
      <div className="bd">
        <div className="bd-head center">
          <h2 className="bd-title big">{g.winner === me ? t('You’re out of cards: you win!') : t('{name} is out of cards and wins!', { name: name(g.winner) })}</h2>
        </div>
        <div className="cc-results">
          {seats.map((s, i) => (
            <span key={s.id} className="cc-result">
              <span className="bd-avatar xs" style={{ background: s.color }}>
                <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
              </span>
              <span>{s.name}</span>
              <span className="cc-result-n">{t('{n} cards', { n: g.hands[i].length })}</span>
            </span>
          ))}
        </div>
        {isHost && (
          <div className="sticky-action">
            <BigButton size="xl" onClick={onNewGame}>
              {t('New game')}
            </BigButton>
          </div>
        )}
      </div>
    );
  }

  const status = g.penalty
    ? myTurn
      ? anyFits
        ? t('{n} cards for you: pass them on with a {card}, or take them', { n: g.penalty.n, card: t(KIND_NAME[g.penalty.kind]) })
        : t('{n} cards for you: take them, then play', { n: g.penalty.n })
      : t('{name} takes {n} or passes them on', { name: name(g.turn), n: g.penalty.n })
    : myTurn
      ? g.drawn != null
        ? t('Play the card you drew, or keep it')
        : mustDraw
          ? t('Nothing fits: draw a card')
          : t('Your turn')
      : t('{name}’s turn', { name: name(g.turn) });
  const hint = myTurn && picked ? t('Tap it again or drag it onto the pile') : myTurn && anyFits && !g.penalty && g.drawn == null ? t('Tap a card to pick it') : ' ';

  const playCard = (c: Card, from: HTMLElement | null) => {
    if (!canPlay(c)) return false;
    if (from) launch.current = { rect: from.getBoundingClientRect(), at: performance.now() };
    if (!c.color) {
      setWild(c);
      return false;
    }
    buzz(10);
    setSel(null);
    act((x) => play(x, me, c.id));
    return true;
  };
  const onTap = (c: Card, el: HTMLElement) => {
    if (!canPlay(c)) return;
    if (sel === c.id) return void playCard(c, el);
    sfx.tick();
    buzz(6);
    setSel(c.id);
  };
  const onPile = () => {
    if (!picked) return;
    playCard(picked, document.querySelector<HTMLElement>(`[data-card="${picked.id}"]`));
  };
  const onDeck = () => {
    if (!myTurn) return;
    if (g.penalty) {
      buzz([15, 30, 15]);
      return act((x) => take(x, me));
    }
    if (g.drawn != null) return;
    buzz(10);
    setSel(null);
    act((x) => draw(x, me));
  };

  // The others round the table, in turn order from your left; you at the bottom.
  const others = seats.map((_, i) => i).filter((i) => i !== me);
  const order = me >= 0 ? others.map((_, k) => (me + 1 + k) % seats.length) : others;
  const spots = seatSpots(order.length, size.w, size.h);
  const pile = g.discard.slice(-4);
  const topCard = pile[pile.length - 1];

  return (
    <div className={`cc fill${big ? ' big-hand' : ''}`}>
      <div className="cc-table" ref={table}>
        <div className={`cc-felt ${g.color}`} aria-hidden>
          <span className="cc-dir">{g.dir === 1 ? '↻' : '↺'}</span>
        </div>
        {order.map((i, k) => {
          const s = seats[i];
          const n = g.hands[i].length;
          const spot = spots[k];
          return (
            <div
              key={s.id}
              data-seat={i}
              className={`cc-seat${g.turn === i ? ' on' : ''}${n === 1 ? ' last' : ''}${order.length > 5 ? ' small' : ''}`}
              style={spot ? { left: spot.x, top: spot.y } : undefined}
            >
              {/* Their hand, face down, as a little stack: as many cards as they hold, the number on it. */}
              <span className="cc-seat-deck" role="img" aria-label={t('{name}: {n} cards', { name: s.name, n })}>
                {Array.from({ length: Math.min(n, 6) }, (_, j) => (
                  <i key={j} className="cc-back" style={{ '--k': j - (Math.min(n, 6) - 1) / 2 } as CSSProperties} />
                ))}
                <span className="cc-seat-n">{n}</span>
              </span>
              <span className="cc-seat-who">
                <span className="bd-avatar xs" style={{ background: s.color }}>
                  <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
                </span>
                <span className="cc-seat-name">{s.name}</span>
              </span>
            </div>
          );
        })}

        <div className="cc-middle">
          <button
            type="button"
            className={`cc-deck${mustDraw || mustTake ? ' must' : ''}`}
            disabled={!myTurn || (g.drawn != null && !g.penalty)}
            onClick={onDeck}
            aria-label={g.penalty && myTurn ? t('Take {n} cards', { n: g.penalty.n }) : t('Draw a card')}
          >
            <span className="cc-deck-stack">
              <i className="cc-back" />
              <i className="cc-back" />
              <i className="cc-back" />
            </span>
            <span className="cc-deck-label">{g.penalty && myTurn ? t('Take {n}', { n: g.penalty.n }) : t('Draw')}</span>
          </button>
          <div className={`cc-pile${picked ? ' ready' : ''}`} data-drop="pile" onClick={onPile} aria-label={t('Top card; the colour is {color}', { color: t(COLOR_NAME[g.color]) })}>
            {pile.map((c) => (
              <span
                key={c.id}
                ref={c === topCard ? topRef : undefined}
                className={`cc-pile-card${c === topCard ? ' top' : ''}`}
                style={{ '--rest': rest(c.id) } as CSSProperties}
              >
                <CardFace card={c} big />
              </span>
            ))}
            {g.penalty && <span className="cc-penalty">+{g.penalty.n}</span>}
          </div>
        </div>
        <span className={`cc-active ${g.color}`}>
          <Shape color={g.color} />
          {t(COLOR_NAME[g.color])}
        </span>
        {toast && (
          <span key={toast.key} className={`cc-toast ${toast.tone}`} role="status">
            {toast.text}
          </span>
        )}
      </div>

      <p className={`cc-status${myTurn ? ' mine' : ''}`} aria-live="polite">
        {status}
      </p>
      <p className="cc-hint">{hint}</p>

      <div className="cc-actions">
        {canCall && (
          <button
            type="button"
            className="cc-call"
            onClick={() => {
              buzz([10, 30, 10]);
              act((x) => callLast(x, me));
            }}
          >
            {t('Last card!')}
          </button>
        )}
        {myTurn && g.penalty && (
          <button type="button" className={`cc-take${mustTake ? ' must' : ''}`} onClick={onDeck}>
            {t('Take {n} cards', { n: g.penalty.n })}
          </button>
        )}
        {myTurn && g.drawn != null && !g.penalty && (
          <button type="button" className="cc-pass" onClick={() => act((x) => pass(x, me))}>
            {t('Keep it')}
          </button>
        )}
      </div>

      {/* Your hand, fanned as you'd hold it: what you may play now stands up, the one you picked
          higher still. A big hand can be laid out flat to look through. */}
      {me < 0 ? (
        <p className="fine-print">{t('Watching')}</p>
      ) : browse ? (
        <div className="fan-row cc-hand">
          <div className="cc-browse" aria-label={t('Your hand')}>
            {shown.map((c) => {
              const ok = canPlay(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  data-card={c.id}
                  className={`cc-hand-card${ok ? ' ok' : ' dim'}${sel === c.id && ok ? ' picked' : ''}`}
                  onClick={(e) => onTap(c, e.currentTarget)}
                  aria-label={cardName(c)}
                  aria-disabled={!ok}
                >
                  <CardFace card={c} />
                </button>
              );
            })}
          </div>
          <div className="fan-tools">
            <BrowseButton on onClick={() => setBrowse(false)} />
            <SortButton
              on={sorted}
              onClick={() => {
                sfx.tick();
                toggleSort();
              }}
            />
          </div>
        </div>
      ) : (
        <HandFan
          className="cc-fan cc-hand"
          cards={shown}
          keyOf={(c) => c.id}
          width={hand.length <= 8 ? 84 : hand.length <= 14 ? 72 : 62}
          ratio={1.33}
          sorted={sorted}
          onSort={toggleSort}
          aside={big ? <BrowseButton onClick={() => setBrowse(true)} /> : undefined}
          label={t('Your hand')}
          card={(c, angle) => (
            <HandCard
              card={c}
              angle={angle}
              ok={canPlay(c)}
              picked={sel === c.id}
              onTap={(el) => onTap(c, el)}
              onDrop={(target, el) => !!target?.closest('.cc-table') && playCard(c, el)}
            />
          )}
        />
      )}

      {/* Which colour, for a Choose colour or an Overload. */}
      <Sheet open={!!wild} onClose={() => setWild(null)} title={t('Which colour?')} closeLabel={t('Cancel')}>
        <div className="cc-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`cc-color ${c}`}
              onClick={() => {
                const card = wild;
                setWild(null);
                if (!card) return;
                buzz(10);
                setSel(null);
                act((x) => play(x, me, card.id, c));
              }}
            >
              <Shape color={c} />
              <span>{t(COLOR_NAME[c])}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/** One card of your hand: tap to pick it (again to play it), or drag it onto the table. Inside its
 *  turned slot, so a drag is turned back to follow the finger, the card standing up straight. */
function HandCard({ card, angle, ok, picked, onTap, onDrop }: { card: Card; angle: number; ok: boolean; picked: boolean; onTap: (el: HTMLElement) => void; onDrop: (target: Element | null, el: HTMLElement | null) => boolean }) {
  const { ref, drag, handlers } = useCardDrag({ rotated: false, onTap, onDrop: (target) => onDrop(target, ref.current) });
  let style: CSSProperties | undefined;
  if (drag) {
    const r = (angle * Math.PI) / 180;
    const x = drag.dx * Math.cos(r) + drag.dy * Math.sin(r);
    const y = -drag.dx * Math.sin(r) + drag.dy * Math.cos(r);
    style = { transform: `translate(${x}px, ${y}px) rotate(${-angle}deg) scale(1.06)` };
  }
  return (
    <span
      ref={ref}
      data-card={card.id}
      role="button"
      tabIndex={ok ? 0 : -1}
      aria-label={cardName(card)}
      aria-disabled={!ok}
      className={`cc-hand-card${ok ? ' ok' : ' dim'}${picked && ok ? ' picked' : ''}${drag ? ' dragging' : ''}`}
      style={style}
      onKeyDown={(e) => {
        if (ok && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap(e.currentTarget);
        }
      }}
      {...(ok ? handlers : {})}
    >
      <CardFace card={card} />
    </span>
  );
}

/** Lays a big hand out flat to look through (or folds it back into a fan). */
function BrowseButton({ on, onClick }: { on?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`sort-btn${on ? ' on' : ''}`} aria-pressed={!!on} aria-label={t('Look through your cards')} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {on ? <path d="M8 4 4 8l4 4M16 12l4 4-4 4M4 8h11M20 16H9" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
      </svg>
    </button>
  );
}

/** The table's size, kept up to date. */
function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 360, h: 360 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Where the others sit: on an arc round the table, from your left over the top to your right, as
 *  they'd sit at a real one. The middle (deck and pile) lies a little below centre; with many, the
 *  arc comes down beside it too. */
export function seatSpots(n: number, w: number, h: number) {
  if (!n) return [];
  const sw = n > 5 ? 62 : 76;
  const sh = n > 5 ? 70 : 86;
  const cx = w / 2;
  const cy = h * 0.61;
  const rx = Math.max(0, cx - sw / 2 - 2);
  // Not further out than just round the felt (global.css: .cc-felt, 62% high, 80vw at most; the
  // table is about the screen less its sides).
  const felt = Math.min(h * 0.31, (w + 32) * 0.4);
  const ry = Math.max(0, Math.min(cy - sh / 2 - 2, felt + sh / 2 + 4));
  const from = n === 1 ? 90 : n === 2 ? 150 : n === 3 ? 162 : n === 4 ? 172 : 196;
  return seatArc(n, { cx, cy, rx, ry, from, maxY: h - sh / 2 });
}

/** How a card lies on the pile: a little turned and off centre, the same on every phone. */
function rest(id: number) {
  const a = ((id * 37) % 29) - 14;
  const x = ((id * 53) % 13) - 6;
  const y = ((id * 71) % 11) - 5;
  return `translate(${x}px, ${y}px) rotate(${a}deg)`;
}

/** Cards drawn: backs fly one after the other from the deck to whoever takes them (for everyone to
 *  see who drew, and how many). Returns when the next one may start. */
function flyBacks(from: DOMRect, to: DOMRect, n: number, delay: number) {
  if (reducedMotion()) return delay;
  const shown = Math.min(n, 8);
  const gap = n > 4 ? 70 : 110;
  for (let k = 0; k < shown; k++) {
    const el = document.createElement('i');
    el.className = 'cc-back cc-fly';
    Object.assign(el.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.appendChild(el);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2) + (k - (shown - 1) / 2) * 6;
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = Math.max(0.3, Math.min(1, (to.width / from.width) * 0.6));
    const a = el.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${dx > 0 ? 8 : -8}deg)`, opacity: 1, offset: 0.85 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s * 0.9})`, opacity: 0 },
      ],
      { duration: 460, delay: delay + k * gap, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)', fill: 'backwards' },
    );
    a.onfinish = a.oncancel = () => el.remove();
  }
  return delay + shown * gap;
}

function cardName(c: Card) {
  if (c.kind === 'number') return `${t(COLOR_NAME[c.color!])} ${c.value}`;
  return c.color ? `${t(COLOR_NAME[c.color])} ${t(KIND_NAME[c.kind])}` : t(KIND_NAME[c.kind]);
}

function toastText(e: Entry, name: (i: number) => string, me: number) {
  switch (e.k) {
    case 'called':
      return e.by === me ? t('Last card!') : t('{name}: last card!', { name: name(e.by) });
    case 'forgot':
      return e.by === me ? t('You forgot “Last card”: +2') : t('{name} forgot “Last card”: +2', { name: name(e.by) });
    case 'take':
      return e.by === me ? t('You take {n}', { n: e.n }) : t('{name} takes {n}', { name: name(e.by), n: e.n });
    case 'skip':
      return e.by === me ? t('You sit out') : t('{name} sits out', { name: name(e.by) });
    default:
      return '';
  }
}

/** A card's place in a sorted hand within its colour: numbers, then Block, Turnaround, Burden, then the universal ones. */
const ORDER: Record<Card['kind'], number> = { number: 0, block: 10, turnaround: 11, burden: 12, spectrum: 20, overload: 21 };
const worth = (c: Card) => ORDER[c.kind] + (c.value ?? 0);

/** The colour's own shape: a diamond, a circle, a triangle, a square. */
export function Shape({ color }: { color: Color }) {
  return (
    <svg className="cc-shape" viewBox="0 0 40 40" aria-hidden>
      {color === 'crimson' && <path d="M20 3 37 20 20 37 3 20Z" />}
      {color === 'azure' && <circle cx="20" cy="20" r="16" />}
      {color === 'amber' && <path d="M17.4 6.5a3 3 0 0 1 5.2 0l13 22.5a3 3 0 0 1-2.6 4.5H7a3 3 0 0 1-2.6-4.5Z" />}
      {color === 'jade' && <rect x="5" y="5" width="30" height="30" rx="6" />}
    </svg>
  );
}

/** A card: its colour, its shape and its number (or action); a universal one dark: Choose colour
 *  with a wheel of all four, Overload with the four shapes and its +4. */
export function CardFace({ card, big }: { card: Card; big?: boolean }) {
  const label = card.kind === 'number' ? String(card.value) : LABEL[card.kind];
  return (
    <span className={`cc-card ${card.color ?? 'universal'} ${card.kind}${big ? ' big' : ''}`}>
      {card.color ? (
        <Shape color={card.color} />
      ) : card.kind === 'spectrum' ? (
        <span className="cc-wheel" aria-hidden />
      ) : (
        <span className="cc-quad" aria-hidden>
          {COLORS.map((c) => (
            <Shape key={c} color={c} />
          ))}
        </span>
      )}
      {label && <span className="cc-num">{label}</span>}
    </span>
  );
}
