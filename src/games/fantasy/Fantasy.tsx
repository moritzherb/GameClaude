import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import HandFan from '../../components/HandFan';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { sortByColour, useSortedHand } from '../../lib/handSort';
import { mix, parseColor, tintTop } from '../../lib/themeColor';
import { flyCopy, flyIn, reducedMotion, seatArc } from '../../lib/cardFly';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import { bid, chooseTrump, FACTIONS, legal, MAX_PLAYERS, maxRounds, MIN_PLAYERS, newGame, nextRound, playCard, QUICK_ROUNDS, takeTrick, type Card, type Faction, type Game } from './logic';

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
const FACTION_NAME: Record<Faction, string> = { fire: tx('Fire'), water: tx('Water'), nature: tx('Nature'), astral: tx('Astral') };
/** The factions' colours, as on the back of the cards. */
const FACTION_COLOR: Record<Faction, string> = { fire: '#b8473a', water: '#4a7a9b', nature: '#5f8a6e', astral: '#7d68a0' };

/** Spellbound: say how many tricks you'll take, then take exactly that many. Every player on their own phone. */
export default function Fantasy() {
  const { state, set, room, isHost, myId } = useShared<Shared>('spell', { g: null, seats: [] });
  const known = useApp().knows('spellbound');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [quick, setQuick] = useState(true);

  if (!state.g || state.seats.length < MIN_PLAYERS) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <h2 className="bd-title">{t('Spellbound')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to deal…', { name: host.name }) : t('Waiting for the host to deal…')}</p>
          </div>
        </div>
      );
    }
    const chosen = (picked ?? online.slice(0, MAX_PLAYERS).map((m) => m.id)).filter((id) => online.some((m) => m.id === id));
    const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-MAX_PLAYERS));
    const seats: Seat[] = online.filter((m) => chosen.includes(m.id)).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }));
    const full = seats.length >= MIN_PLAYERS ? maxRounds(seats.length) : 0;
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('3 to 6 players, 60 cards')}</span>
          <h2 className="bd-title big">{t('Spellbound')}</h2>
          {!known && <p className="lead">{t('Say how many tricks you’ll take each round. Hitting it exactly is what scores.')}</p>}
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
        <div className="settings-list">
          <button type="button" role="switch" aria-checked={quick} className={`setting-row${quick ? ' on' : ''}`} onClick={() => setQuick(!quick)}>
            <span className="setting-text">
              <span className="setting-label">{t('Quick match')}</span>
              <span className="setting-hint">{quick ? t('{n} rounds', { n: QUICK_ROUNDS }) : full ? t('All {n} rounds', { n: full }) : t('All rounds')}</span>
            </span>
            <span className="switch">
              <span className="switch-knob" />
            </span>
          </button>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" disabled={seats.length < MIN_PLAYERS} onClick={() => set({ g: newGame(seats.length, quick), seats })}>
            {seats.length < MIN_PLAYERS ? t('At least 3 players') : t('Deal the cards')}
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
  const name = (i: number) => seats[i]?.name ?? t('Someone');
  const [sorted, toggleSort] = useSortedHand();
  const hand = me >= 0 ? g.hands[me] : [];
  const shown = sorted ? sortByColour(hand, (c) => (c.kind === 'number' ? c.faction : null), (c) => (c.kind === 'number' ? c.rank : c.kind === 'archmage' ? 0 : 1), FACTIONS) : hand;
  const mine = g.turn === me;
  const table = useRef<HTMLDivElement>(null);
  const size = useSize(table);
  // Where the card you just played was in your hand: it flies from there.
  const launch = useRef<DOMRect | null>(null);

  // A fresh deal is dealt out on every phone: backs fly from the deck to everyone, your hand fans
  // in, then the trump card turns over and its colour floods the table. Until then no bids.
  const fresh = (g.phase === 'bidding' || g.phase === 'trump') && !g.trick.length && !g.lastTrick && g.bids.every((b) => b == null);
  const [dealt, setDealt] = useState(() => (fresh ? -1 : g.dealId));
  const dealing = fresh && dealt !== g.dealId;
  const perSeat = Math.min(g.round, 4);
  const dealTime = Math.min(1300, g.players * perSeat * 90);
  const started = useRef(-1);
  useLayoutEffect(() => {
    if (!dealing) return;
    const box = table.current;
    const deck = box?.querySelector('.fz-deck-top');
    if (started.current !== g.dealId && box && deck) {
      started.current = g.dealId;
      const from = deck.getBoundingClientRect();
      const gap = dealTime / Math.max(1, g.players * perSeat);
      let k = 0;
      for (let r = 0; r < perSeat; r++)
        for (let p = 1; p <= g.players; p++) {
          const seat = (g.dealer + p) % g.players;
          const to = (seat === me ? document.querySelector('.fz-hand .fan') : box.querySelector(`[data-seat="${seat}"] .fz-seat-who`))?.getBoundingClientRect();
          if (to) flyCopy(deck, from, seat === me ? new DOMRect(to.left + to.width / 2 - 30, to.top, 60, 90) : to, { delay: k * gap, duration: 420, turn: 8 });
          k++;
        }
      sfx.tick();
    }
    const id = window.setTimeout(() => setDealt(g.dealId), dealTime + 450);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.dealId, dealing]);

  // The trump's colour floods the table from the trump card once it's turned (or picked).
  const [sky, setSky] = useState<Faction | null>(() => (fresh ? null : g.trump));
  const [reveal, setReveal] = useState(0);
  useEffect(() => {
    if (dealing) return setSky(null);
    if (g.trump === sky) return;
    if (!g.trump) return setSky(null);
    const f = g.trump;
    setReveal((r) => r + 1);
    const card = table.current?.querySelector('.fz-trump-card');
    const done = flood(card?.getBoundingClientRect() ?? null, skyColor(f), 650);
    const id = window.setTimeout(() => setSky(f), done);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.trump, dealing]);
  useTrumpSky(sky);

  // A card played comes from its player (your own from your hand) to where it lies on the trick.
  const trickRef = useRef<HTMLDivElement>(null);
  const shownTrick = g.trick;
  const lastId = shownTrick.at(-1)?.card.id;
  useLayoutEffect(() => {
    const p = shownTrick.at(-1);
    if (!p) return;
    const el = trickRef.current?.querySelector<HTMLElement>(`[data-trick="${p.card.id}"]`);
    const from = p.seat === me && launch.current ? launch.current : table.current?.querySelector(`[data-seat="${p.seat}"] .fz-seat-who`)?.getBoundingClientRect();
    launch.current = null;
    if (el && from) flyIn(el, from, 360);
    sfx.pop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);
  // A trick taken goes to its winner, lying beside them: its cards fly there from the table.
  const lastSeen = useRef<HTMLElement[]>([]);
  useLayoutEffect(() => {
    if (g.trick.length) lastSeen.current = [...(trickRef.current?.querySelectorAll<HTMLElement>('.fz-trick-card') ?? [])].map((el) => el);
  });
  const takenKey = g.lastTrick ? g.lastTrick.cards.map((p) => p.card.id).join() : '';
  const prevTaken = useRef(takenKey);
  useLayoutEffect(() => {
    if (takenKey === prevTaken.current) return;
    prevTaken.current = takenKey;
    const w = g.lastTrick?.winner;
    if (w == null) return;
    const to = (w === me ? document.querySelector('.fz-mine .fz-tricks') : table.current?.querySelector(`[data-seat="${w}"] .fz-tricks`))?.getBoundingClientRect();
    if (!to) return;
    lastSeen.current.forEach((el, k) => {
      const r = el.dataset.rect ? (JSON.parse(el.dataset.rect) as { l: number; t: number; w: number; h: number }) : null;
      if (r) flyCopy(el, new DOMRect(r.l, r.t, r.w, r.h), new DOMRect(to.left, to.top, to.height / 1.5, to.height), { delay: k * 50, duration: 420 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenKey]);
  // Remember where the trick's cards lie (they're gone from the page once taken).
  useLayoutEffect(() => {
    for (const el of trickRef.current?.querySelectorAll<HTMLElement>('.fz-trick-card') ?? []) {
      const r = el.getBoundingClientRect();
      el.dataset.rect = JSON.stringify({ l: r.left, t: r.top, w: r.width, h: r.height });
    }
  });

  // Your turn: a nudge you can feel, and the hand gives a little hop (global.css: .fz-fan.hop).
  const myMove = !dealing && mine && g.taking == null && (g.phase === 'playing' || g.phase === 'bidding' || g.phase === 'trump');
  useEffect(() => {
    if (myMove) buzz(12);
  }, [myMove, g.phase]);

  // A trick nobody takes (its winner gone quiet): after a while the host can take it for them.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    setStale(false);
    if (g.taking == null) return;
    const id = window.setTimeout(() => setStale(true), 6000);
    return () => window.clearTimeout(id);
  }, [g.taking]);

  const trumpText = dealing ? (
    '…'
  ) : g.trump ? (
    <>
      <Sigil faction={g.trump} /> {t(FACTION_NAME[g.trump])}
    </>
  ) : g.phase === 'trump' ? (
    t('The dealer picks')
  ) : (
    t('No trump')
  );

  if (g.phase === 'summary' || g.phase === 'over') {
    const order = seats.map((s, i) => ({ s, i })).sort((a, b) => (g.phase === 'over' ? g.scores[b.i] - g.scores[a.i] : 0));
    return (
      <div className="bd">
        <div className="bd-head center">
          <span className="kicker">{t('Round {n} of {m}', { n: g.round, m: g.rounds })}</span>
          <h2 className="bd-title big">{g.phase === 'over' ? t('{name} wins!', { name: name(order[0].i) }) : t('Round over')}</h2>
        </div>
        <div className="fz-results">
          {order.map(({ s, i }) => (
            <div key={s.id} className="fz-row">
              <span className="bd-avatar xs" style={{ background: s.color }}>
                <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
              </span>
              <span className="fz-name">{s.name}</span>
              <span className="fz-bid">{t('{won} of {bid}', { won: g.won[i], bid: g.bids[i] ?? 0 })}</span>
              <span className={`fz-gain${g.gained[i] >= 0 ? ' up' : ' down'}`}>{g.gained[i] > 0 ? `+${g.gained[i]}` : g.gained[i]}</span>
              <span className="fz-total">{g.scores[i]}</span>
            </div>
          ))}
        </div>
        {isHost && (
          <div className="sticky-action">
            <BigButton size="xl" onClick={g.phase === 'over' ? onNewGame : () => act((x) => nextRound(x))}>
              {g.phase === 'over' ? t('New game') : t('Next round: {n} cards', { n: g.round + 1 })}
            </BigButton>
          </div>
        )}
      </div>
    );
  }

  const status = dealing
    ? t('Dealing…')
    : g.taking != null
      ? g.taking === me
        ? t('Your trick: take it')
        : t('{name} wins the trick', { name: name(g.taking) })
      : g.phase === 'trump'
        ? mine
          ? t('An Archmage was turned: you pick trump')
          : t('{name} picks trump', { name: name(g.dealer) })
        : g.phase === 'bidding'
          ? mine
            ? t('How many tricks will you take?')
            : t('{name} is bidding', { name: name(g.turn) })
          : mine
            ? g.trick.length
              ? t('Your turn: play a card')
              : t('Your turn: lead a card')
            : t('{name}’s turn', { name: name(g.turn) });

  // The others round the table in turn order from your left, you at the bottom.
  const others = seats.map((_, i) => i).filter((i) => i !== me);
  const order = me >= 0 ? others.map((_, k) => (me + 1 + k) % seats.length) : others;
  const cx = size.w / 2;
  const cy = size.h * 0.56;
  const n = order.length;
  // With many, the arc comes down beside the middle too (but stays above the deck in the corner).
  const spots = seatArc(n, { cx, cy, rx: Math.max(0, cx - 46), ry: Math.max(0, cy - 30), from: n <= 2 ? 150 : n === 3 ? 166 : 186, maxY: size.h - (n >= 4 ? 124 : 30) });
  // The trick's cards as big as the table has room for.
  const tw = Math.round(Math.max(52, Math.min(78, size.w * 0.19, size.h * 0.22)));
  const spotOf = (seat: number) => {
    const k = order.indexOf(seat);
    return k >= 0 ? spots[k] : { x: cx, y: size.h + 60 };
  };
  const winnerId = g.taking != null ? g.trick.find((p) => p.seat === g.taking)?.card.id : undefined;

  return (
    <div className="fz fill">
      <div className="fz-top">
        <span className="fz-round">{t('Round {n} of {m}', { n: g.round, m: g.rounds })}</span>
        <span className="fz-trump">
          {t('Trump')}: {trumpText}
        </span>
      </div>

      <div className="fz-table-area" ref={table} style={{ '--cy': `${Math.round(cy)}px`, '--tw': `${tw}px` } as CSSProperties}>
        {/* The others: who, their bid and tricks so far, their score; the tricks they took beside them. */}
        {order.map((i, k) => {
          const s = seats[i];
          const spot = spots[k];
          return (
            <div key={s.id} data-seat={i} className={`fz-seat${g.turn === i && !dealing ? ' on' : ''}${spot && spot.x > cx + 4 ? ' right' : ''}`} style={spot ? { left: spot.x, top: spot.y } : undefined}>
              <span className="fz-seat-who">
                <span className="bd-avatar xs" style={{ background: s.color }}>
                  <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
                </span>
                <span className="fz-seat-name">{s.name}</span>
              </span>
              <span className="fz-seat-meta">
                <span className="fz-seat-bid">{g.bids[i] == null ? t('bidding') : t('{won} of {bid}', { won: g.won[i], bid: g.bids[i]! })}</span>
                <span className="fz-seat-score">{t('{n} pts', { n: g.scores[i] })}</span>
              </span>
              <Tricks n={g.won[i]} />
            </div>
          );
        })}

        {/* Beside the table: the rest of the deck, the trump card turned up on it for all to see. */}
        <div className="fz-deck" aria-label={g.turned ? t('Turned up for trump') : undefined}>
          <span className="fz-deck-stack">
            <CardBack />
            <CardBack />
            <span className="fz-deck-top">
              <CardBack />
            </span>
          </span>
          {g.turned && (
            <span key={`${g.dealId}:${reveal}`} className={`fz-trump-card${dealing ? ' hidden' : ' reveal'}${g.trump ? ` ${g.trump}` : ''}`}>
              <span className="fz-burst" aria-hidden />
              <span className="fz-flip">
                <CardFace card={g.turned} />
                <CardBack />
              </span>
            </span>
          )}
        </div>

        {/* The trick: each card lies in front of whoever played it, a little turned, overlapping. */}
        <div className="fz-pile" ref={trickRef}>
          {g.trick.map((p, k) => {
            const spot = p.seat === me ? { x: cx, y: size.h + 60 } : spotOf(p.seat);
            const dx = spot.x - cx;
            const dy = spot.y - cy;
            const len = Math.hypot(dx, dy) || 1;
            const reach = tw * 0.34;
            return (
              <div
                key={p.card.id}
                data-trick={p.card.id}
                className={`fz-trick-card${winnerId === p.card.id ? ' won' : ''}${winnerId != null && winnerId !== p.card.id ? ' lost' : ''}`}
                style={{ '--rest': `translate(${((dx / len) * reach).toFixed(1)}px, ${((dy / len) * reach).toFixed(1)}px) rotate(${tilt(p.card.id)}deg)`, zIndex: k + 1 } as CSSProperties}
              >
                <CardFace card={p.card} />
              </div>
            );
          })}
        </div>
      </div>

      {/* You: your bid, your tricks beside you, your score. */}
      {me >= 0 && (
        <div className="fz-mine">
          <Tricks n={g.won[me]} />
          <span className="fz-mine-bid">{g.bids[me] == null ? t('No bid yet') : t('{won} of {bid} tricks', { won: g.won[me], bid: g.bids[me]! })}</span>
          <span className="fz-seat-score">{t('{n} pts', { n: g.scores[me] })}</span>
        </div>
      )}

      <p className={`fz-status${myMove ? ' mine' : ''}`} aria-live="polite">
        {status}
      </p>

      {/* What you can do now, always the same height (so nothing below moves). */}
      <div className="fz-picks">
        {g.taking != null && (g.taking === me || (isHost && stale)) ? (
          <BigButton
            onClick={() => {
              buzz([10, 30, 10]);
              act((x) => takeTrick(x));
            }}
          >
            {g.taking === me ? t('Take the trick') : t('Take it for {name}', { name: name(g.taking) })}
          </BigButton>
        ) : !dealing && g.phase === 'trump' && mine ? (
          FACTIONS.map((f) => (
            <button key={f} type="button" className={`fz-pick ${f}`} onClick={() => act((x) => chooseTrump(x, me, f))}>
              <Sigil faction={f} on /> {t(FACTION_NAME[f])}
            </button>
          ))
        ) : !dealing && g.phase === 'bidding' && mine ? (
          <div className="fz-bids">
            {Array.from({ length: g.round + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                className="fz-bid-btn"
                onClick={() => {
                  sfx.pop();
                  buzz(10);
                  act((x) => bid(x, me, n));
                }}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Your hand, fanned as you'd hold it: what you may play now stands up. */}
      {me >= 0 ? (
        <HandFan
          className={`fz-fan fz-hand${dealing ? ' dealing' : ''}${myMove ? ' hop' : ''}`}
          cards={shown}
          keyOf={(c) => c.id}
          width={hand.length <= 8 ? 82 : hand.length <= 13 ? 70 : 60}
          ratio={1.5}
          sorted={sorted}
          onSort={toggleSort}
          label={t('Your hand')}
          card={(c) => {
            const ok = !dealing && g.phase === 'playing' && mine && legal(g, me, c);
            const k = hand.findIndex((x) => x.id === c.id);
            return (
              <button
                type="button"
                className={`fz-hand-card${ok ? ' ok' : ''}${!ok && g.phase === 'playing' ? ' dim' : ''}`}
                style={{ '--i': k } as CSSProperties}
                disabled={!ok}
                aria-label={cardName(c)}
                onClick={(e) => {
                  launch.current = e.currentTarget.getBoundingClientRect();
                  buzz(10);
                  act((x) => playCard(x, me, c.id));
                }}
              >
                <CardFace card={c} />
              </button>
            );
          }}
        />
      ) : (
        <p className="fine-print">{t('Watching')}</p>
      )}
    </div>
  );
}

/** The tricks someone has taken, face down beside them: a little stack, one card per trick. */
function Tricks({ n }: { n: number }) {
  return (
    <span className="fz-tricks" role="img" aria-label={t('{n} tricks', { n })}>
      {Array.from({ length: Math.min(n, 8) }, (_, k) => (
        <i key={k} style={{ '--k': k } as CSSProperties} />
      ))}
    </span>
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

/** How a card lies on the trick: a little turned, the same on every phone. */
const tilt = (id: number) => ((id * 37) % 25) - 12;

/** The table's colour under a trump: a deep shade of it in the dark, a pale one in the light. */
function skyColor(f: Faction) {
  const root = document.documentElement;
  const ground = getComputedStyle(root).getPropertyValue('--bg').trim();
  const c = parseColor(ground);
  const dark = !c || c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 < 128;
  return mix(ground, FACTION_COLOR[f], dark ? 0.34 : 0.22);
}

/** The colour pours out from the trump card over the whole screen; returns when it's done (ms). */
function flood(from: DOMRect | null, color: string, delay: number) {
  if (reducedMotion()) return 0;
  const el = document.createElement('div');
  el.className = 'fz-flood';
  el.style.background = color;
  const x = from ? from.left + from.width / 2 : innerWidth / 2;
  const y = from ? from.top + from.height / 2 : innerHeight / 2;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.body.appendChild(el);
  const duration = 900;
  const a = el.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${Math.ceil(r)}px at ${x}px ${y}px)` }], { duration, delay, easing: 'cubic-bezier(0.55, 0, 0.25, 1)', fill: 'both' });
  // Gone a moment after the page itself has taken the colour.
  a.onfinish = () => window.setTimeout(() => el.remove(), 120);
  a.oncancel = () => el.remove();
  return delay + duration;
}

/**
 * While a trump is turned up, the whole screen takes its colour (the strip under the clock too): a
 * deep shade of it in the dark, a pale one in the light.
 */
function useTrumpSky(trump: Faction | null) {
  useEffect(() => {
    if (!trump) return;
    const root = document.documentElement;
    const own = root.style.getPropertyValue('--bg');
    const sky = skyColor(trump);
    root.style.setProperty('--bg', sky);
    const release = tintTop(sky);
    return () => {
      if (own) root.style.setProperty('--bg', own);
      else root.style.removeProperty('--bg');
      release();
    };
  }, [trump]);
}

/** A faction's sign: a flame, a drop, a leaf, a star. */
const SIGIL: Record<Faction, ReactNode> = {
  fire: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  water: <path d="M12 2.8c-2.8 3.9-6.2 7.6-6.2 11.3a6.2 6.2 0 0 0 12.4 0c0-3.7-3.4-7.4-6.2-11.3z" />,
  nature: (
    <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
      <path d="M3 21c1.2-2.5 4-6 10-9" />
    </g>
  ),
  astral: <path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7z" strokeLinejoin="round" />,
};

export function Sigil({ faction, on }: { faction: Faction; on?: boolean }) {
  return (
    <svg className={`fz-sigil ${faction}${on ? ' on' : ''}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {SIGIL[faction]}
    </svg>
  );
}

/** Where the signs sit on a card of each number (100 × 150), as on a deck of playing cards: two
 *  columns and a middle one; the lower half upside down. */
const L = 31;
const C = 50;
const R = 69;
const FIVE = [34, 54.5, 75, 95.5, 116];
const FOUR = [34, 61.3, 88.7, 116];
const sides = (ys: number[]) => ys.flatMap((y) => [[L, y] as const, [R, y] as const]);
const PIPS: Record<number, (readonly [number, number])[]> = {
  2: [[C, 34], [C, 116]],
  3: [[C, 34], [C, 75], [C, 116]],
  4: sides([34, 116]),
  5: [...sides([34, 116]), [C, 75]],
  6: sides([34, 75, 116]),
  7: [...sides([34, 75, 116]), [C, 54.5]],
  8: [...sides([34, 75, 116]), [C, 54.5], [C, 95.5]],
  9: [...sides(FOUR), [C, 75]],
  10: [...sides(FOUR), [C, 47.7], [C, 102.3]],
  11: [...sides(FOUR), [C, 40], [C, 75], [C, 110]],
  12: [...sides(FIVE), [C, 44.75], [C, 105.25]],
  13: [...sides(FIVE), [C, 44.75], [C, 75], [C, 105.25]],
};

/** One sign at (x, y), `size` across, turned upside down in the lower half. */
function Pip({ f, x, y, size }: { f: Faction; x: number; y: number; size: number }) {
  const k = size / 24;
  return (
    <g transform={`translate(${x} ${y})${y > 75 ? ' rotate(180)' : ''} translate(${-size / 2} ${-size / 2}) scale(${k})`} fill="#fff" color="#fff">
      {SIGIL[f]}
    </g>
  );
}

/** The number and the sign in a corner (top left; the bottom right is the same turned round); no
 *  number: the sign alone, a little bigger. */
function Index({ label, children }: { label?: string; children: ReactNode }) {
  const one = label ? (
    <>
      <text x="11" y="19" textAnchor="middle" className="fz-idx">
        {label}
      </text>
      <g transform="translate(5.5 23) scale(0.46)">{children}</g>
    </>
  ) : (
    <g transform="translate(4 5) scale(0.62)">{children}</g>
  );
  return (
    <>
      {one}
      <g transform="rotate(180 50 75)">{one}</g>
    </>
  );
}

/** A card: all in its faction's colour, the number in two corners and as many signs in the middle
 *  as it counts (the 1 one big sign); an Archmage night blue with a gold star, a Fool pale with a moon. */
export function CardFace({ card }: { card: Card }) {
  if (card.kind !== 'number') {
    const mage = card.kind === 'archmage';
    const ink = mage ? '#e2c27a' : '#5b5446';
    const glyph = mage ? STAR : MOON;
    return (
      <svg className={`fz-card ${card.kind}`} viewBox="0 0 100 150" role="img" aria-label={mage ? t('Archmage') : t('Fool')}>
        <rect x="0" y="0" width="100" height="150" rx="9" className="fz-card-ground" />
        <rect x="4.5" y="4.5" width="91" height="141" rx="6" fill="none" stroke={ink} strokeOpacity="0.45" strokeWidth="0.8" />
        <g color={ink} fill={ink}>
          <Index>{glyph}</Index>
          {mage && <circle cx="50" cy="75" r="27" fill="none" stroke={ink} strokeWidth="0.9" strokeOpacity="0.6" />}
          <g transform="translate(26 51) scale(2)">{glyph}</g>
        </g>
      </svg>
    );
  }
  const f = card.faction;
  return (
    <svg className={`fz-card ${f}`} viewBox="0 0 100 150" role="img" aria-label={`${t(FACTION_NAME[f])} ${card.rank}`}>
      <rect x="0" y="0" width="100" height="150" rx="9" className="fz-card-ground" />
      <rect x="4.5" y="4.5" width="91" height="141" rx="6" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.8" />
      <g fill="#fff" color="#fff">
        <Index label={String(card.rank)}>{SIGIL[f]}</Index>
      </g>
      {card.rank === 1 ? <Pip f={f} x={50} y={75} size={44} /> : PIPS[card.rank].map(([x, y], k) => <Pip key={k} f={f} x={x} y={y} size={card.rank >= 11 ? 15 : 18} />)}
    </svg>
  );
}

const STAR = <path d="M12 1.5l2.2 6.6 6.6-2.4-4 5.8 5.7 3.5-6.9.4.9 6.9L12 17.6 7.5 22.3l.9-6.9-6.9-.4 5.7-3.5-4-5.8 6.6 2.4z" />;
const MOON = <path d="M15.5 3.2A9 9 0 1 0 20.8 15 7.2 7.2 0 0 1 15.5 3.2z" />;

function cardName(c: Card) {
  if (c.kind === 'number') return `${t(FACTION_NAME[c.faction])} ${c.rank}`;
  return c.kind === 'archmage' ? t('Archmage') : t('Fool');
}

/** The back of a card, as drawn: gold rings and rays on near-black, the four signs round a star. */
export function CardBack() {
  const gold = '#b99a5f';
  const at = (f: Faction, x: number, y: number) => (
    <g transform={`translate(${x - 5.5} ${y - 5.5}) scale(0.46)`} style={{ color: FACTION_COLOR[f] }} fill="currentColor">
      {SIGIL[f]}
    </g>
  );
  return (
    <svg className="fz-card back" viewBox="0 0 100 150" aria-hidden>
      <rect x="0.6" y="0.6" width="98.8" height="148.8" rx="10" fill="#202124" stroke={gold} strokeWidth="1.2" />
      <rect x="5" y="5" width="90" height="140" rx="7.5" fill="none" stroke={gold} strokeWidth="0.9" />
      <rect x="9" y="9" width="82" height="132" rx="5.5" fill="none" stroke={gold} strokeWidth="0.4" />
      <g fill="none" stroke={gold} strokeLinecap="round">
        <circle cx="50" cy="75" r="30" strokeWidth="1.1" />
        <circle cx="50" cy="75" r="25" strokeWidth="0.5" />
        <circle cx="50" cy="75" r="11.4" strokeWidth="0.5" />
        <path d="M50 34v82M11 75h78M22.7 47.7l54.6 54.6M77.3 47.7l-54.6 54.6" strokeWidth="0.35" />
      </g>
      <g transform="translate(44 69) scale(0.5)" fill={gold}>
        {SIGIL.astral}
      </g>
      {at('fire', 50, 58.5)}
      {at('water', 66.6, 75)}
      {at('nature', 50, 91.5)}
      {at('astral', 33.4, 75)}
    </svg>
  );
}
