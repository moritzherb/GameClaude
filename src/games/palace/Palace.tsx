import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import { t } from '../../i18n';
import { cardName, rankLabel, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { randomInt } from '../../lib/random';
import { load, save } from '../../lib/storage';
import { useRoom } from '../../net/RoomProvider';
import { useApp } from '../../state/AppState';
import { apply, deal, fits, MAX_PLAYERS, MIN_PLAYERS, same, TABLE, viewFor, type Act, type Entry, type Game, type Need, type View } from './logic';

/* ---------------- Messages between phones ---------------- */

interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Match {
  game: Game;
  seats: Seat[];
}

type PhoneView = View & { seats: Seat[] };

type Msg = { g: 'pl'; type: 'view'; view: PhoneView | null } | { g: 'pl'; type: 'act'; act: Act } | { g: 'pl'; type: 'sync' };

const isMsg = (d: unknown): d is Msg => typeof d === 'object' && d !== null && (d as Msg).g === 'pl';

const STORE_KEY = 'palace:match';

const phoneView = (m: Match, id: string): PhoneView => ({ ...viewFor(m.game, m.seats.findIndex((s) => s.id === id)), seats: m.seats });

function applyFrom(m: Match, fromId: string, act: Act): Match {
  const who = m.seats.findIndex((s) => s.id === fromId);
  if (who < 0) return m;
  const game = apply(m.game, who, act);
  return game === m.game ? m : { ...m, game };
}

/**
 * Host phone: the table. It owns the game, applies the players' moves and sends every phone
 * only what it may see: its own hand, everyone's face-up cards, and how many cards the others hold.
 */
function usePalace() {
  const room = useRoom();
  const isHost = room.role === 'host';
  const myId = room.myId ?? '';
  const { onGame, sendTo, sendToHost, members, code } = room;
  const [match, setMatch] = useState<Match | null>(null);
  const [guestView, setGuestView] = useState<PhoneView | null>(null);
  const matchRef = useRef(match);
  matchRef.current = match;
  const restored = useRef(false);

  useEffect(() => {
    if (!isHost || !code || restored.current) return;
    restored.current = true;
    const saved = load<{ code: string; match: Match } | null>(STORE_KEY, null);
    if (saved?.code === code) setMatch(saved.match);
  }, [isHost, code]);

  useEffect(() => {
    if (isHost && code && restored.current) save(STORE_KEY, match ? { code, match } : null);
  }, [isHost, code, match]);

  // A move waits for the host's answer (a new view); if none comes, it's sent again. Safe: the
  // host ignores a move that's no longer valid, so it can't be applied twice.
  const pending = useRef<{ act: Act; tries: number; timer?: number } | null>(null);
  const clearPending = () => {
    window.clearTimeout(pending.current?.timer);
    pending.current = null;
  };
  const sendPending = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    sendToHost({ g: 'pl', type: 'act', act: p.act } satisfies Msg);
    p.tries++;
    if (p.tries < 5) p.timer = window.setTimeout(sendPending, 3000);
    else pending.current = null;
  }, [sendToHost]);

  const act = useCallback(
    (a: Act) => {
      if (isHost) {
        setMatch((m) => (m ? applyFrom(m, myId, a) : m));
        return;
      }
      clearPending();
      pending.current = { act: a, tries: 0 };
      sendPending();
    },
    [isHost, myId, sendPending],
  );

  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (!isMsg(data) || !fromId) return;
      if (data.type === 'act') setMatch((m) => (m ? applyFrom(m, fromId, data.act) : m));
      if (data.type === 'sync') {
        const m = matchRef.current;
        sendTo(fromId, { g: 'pl', type: 'view', view: m ? phoneView(m, fromId) : null } satisfies Msg);
      }
    });
  }, [isHost, onGame, sendTo]);

  useEffect(() => {
    if (!isHost) return;
    for (const m of members) {
      if (m.id === myId || !m.online) continue;
      sendTo(m.id, { g: 'pl', type: 'view', view: match ? phoneView(match, m.id) : null } satisfies Msg);
    }
  }, [isHost, match, members, myId, sendTo]);

  useEffect(() => {
    if (isHost) return;
    let last = '';
    const off = onGame((data) => {
      if (!isMsg(data) || data.type !== 'view') return;
      const json = JSON.stringify(data.view);
      if (json === last) return;
      last = json;
      clearPending();
      setGuestView(data.view);
    });
    sendToHost({ g: 'pl', type: 'sync' } satisfies Msg);
    return off;
  }, [isHost, onGame, sendToHost]);

  const view = isHost ? (match ? phoneView(match, myId) : null) : guestView;
  return { room, isHost, view, act, setMatch, connected: isHost || room.status === 'open' };
}

/* ---------------- Screen ---------------- */

export default function Palace() {
  const { room, isHost, view, act, setMatch, connected } = usePalace();
  const known = useApp().knows('palace');
  useFeedback(view);

  if (!view) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="pl">
          <div className="connecting">
            <div className="connecting-emoji">🏰</div>
            <h2 className="bd-title">{t('Palace')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to deal…', { name: host.name }) : t('Waiting for the host to deal…')}</p>
          </div>
        </div>
      );
    }
    // The host's phone is the table; everyone else plays on their own phone.
    const online = room.members.filter((m) => m.online && !m.host);
    const ready = online.slice(0, MAX_PLAYERS);
    return (
      <div className="pl">
        <div className="bd-head">
          <span className="kicker">{t('This phone is the table')}</span>
          <h2 className="bd-title big">{t('Palace')}</h2>
          {!known && <p className="lead">{t('Get rid of all your cards: first your hand, then the three face-up cards, then the three face-down ones, blind.')}</p>}
        </div>
        <ul className="member-list">
          {ready.map((m) => (
            <li key={m.id} className="member-row">
              <span className="player-avatar" style={{ '--chip': m.color } as CSSProperties}>
                {m.avatar}
              </span>
              <span className="member-text">
                <span className="member-name">{m.name}</span>
              </span>
            </li>
          ))}
        </ul>
        {!known && <p className="fine-print">{t('Put this phone in the middle: it shows the pile and everyone’s face-up cards. Everyone else plays on their own phone.')}</p>}
        {online.length > MAX_PLAYERS && <p className="notice">{t('Max {max} players. The first {max} play.', { max: MAX_PLAYERS })}</p>}
        {!known && <p className="fine-print">{t('Turn order is the order above. A random player deals first.')}</p>}
        <div className="sticky-action">
          <BigButton
            size="xl"
            disabled={ready.length < MIN_PLAYERS}
            onClick={() =>
              setMatch({
                game: deal(ready.length, randomInt(0, ready.length - 1)),
                seats: ready.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color })),
              })
            }
          >
            {ready.length < MIN_PLAYERS ? t('Waiting for players…') : t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {view.me < 0 ? <TableView view={view} /> : view.phase === 'setup' ? <Setup view={view} act={act} /> : <PlayerView view={view} act={act} connected={connected} />}
      {view.phase === 'over' && view.winner != null && <Over view={view} isHost={isHost} onNewGame={() => setMatch(null)} />}
    </>
  );
}

/* ---------------- Words ---------------- */

const nameOf = (view: PhoneView, i: number) => view.seats[i]?.name ?? t('Someone');

function needText(need: Need) {
  if (need.kind === 'any') return t('Anything goes');
  if (need.kind === 'max7') return t('7 or lower');
  return t('{rank} or higher', { rank: rankLabel(need.v) });
}

const group = (cards: Card[]) => (cards.length > 1 ? `${cards.length}× ${rankLabel(cards[0].value)}` : cardName(cards[0]));

function entryText(e: Entry, view: PhoneView) {
  const name = nameOf(view, e.by);
  if (e.k === 'take') {
    if (e.how === 'risk' && e.failed) return t('{name} risked it: {card} doesn’t fit. Takes the pile ({n} cards).', { name, card: cardName(e.failed), n: e.n });
    if (e.how === 'blind' && e.failed) return t('{name} turned over {card}: no luck. Takes the pile ({n} cards).', { name, card: cardName(e.failed), n: e.n });
    return t('{name} takes the pile ({n} cards).', { name, n: e.n });
  }
  const cards = group(e.cards);
  let text =
    e.from === 'risk'
      ? t('{name} risked it: {card} fits!', { name, card: cards })
      : e.from === 'down'
        ? t('{name} turned over {card}: it fits!', { name, card: cards })
        : t('{name} plays {cards}.', { name, cards });
  if (e.burn) text += ` ${t('The pile is cleared!')}`;
  return text;
}

function turnText(view: PhoneView) {
  const name = nameOf(view, view.turn);
  if (view.again) return t('{name} goes again', { name });
  return t('{name}’s turn', { name });
}

/* ---------------- The table (host's phone) ---------------- */

function TableView({ view }: { view: PhoneView }) {
  const last = view.log.at(-1);
  // Cards leaving the pile (cleared away, or taken up) stay a moment longer for their exit.
  const prev = useRef(view);
  const [ghost, setGhost] = useState<{ cards: Card[]; kind: 'burn' | 'take'; id: string } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    const e = view.log.at(-1);
    if (!e || JSON.stringify(e) === JSON.stringify(before.log.at(-1))) return;
    if (view.burned > before.burned && e.k === 'play') setGhost({ cards: [...before.pile, ...e.cards].slice(-4), kind: 'burn', id: JSON.stringify(e) });
    else if (e.k === 'take') setGhost({ cards: [...before.pile, ...(e.failed ? [e.failed] : [])].slice(-4), kind: 'take', id: JSON.stringify(e) });
  }, [view]);
  useEffect(() => {
    if (!ghost) return;
    const id = window.setTimeout(() => setGhost(null), 1100);
    return () => window.clearTimeout(id);
  }, [ghost]);
  // The cards just played land one after the other.
  const fresh = last?.k === 'play' && !last.burn ? Math.min(last.cards.length, view.pile.length) : 0;
  return (
    <div className="pl pl-table fill">
      <div className="pl-seats" style={{ '--cols': view.seats.length <= 3 ? view.seats.length : view.seats.length === 4 ? 2 : 3 } as CSSProperties}>
        {view.seats.map((s, i) => {
          const side = view.sides[i];
          return (
            <div
              key={s.id}
              className={`pl-seat${i === view.turn && view.phase === 'play' ? ' turn' : ''}${view.winner === i ? ' won' : ''}`}
              style={{ '--chip': s.color } as CSSProperties}
            >
              <div className="pl-seat-head">
                <span className="pl-seat-avatar">{s.avatar}</span>
                <span className="pl-seat-name">{s.name}</span>
                {i === view.dealer && <span className="pl-dealer">{t('D')}</span>}
              </div>
              <Palace3 up={side.up} down={side.down} />
              <span className="pl-seat-hand">
                {view.phase === 'setup' ? (side.ready ? t('Ready') : t('Choosing…')) : t('{n} in hand', { n: side.hand })}
              </span>
            </div>
          );
        })}
      </div>

      <section className="pl-felt">
        <div className="pl-felt-row">
          <div className="pl-heap">
            <div className="pl-stack">{view.stock > 0 ? <span className="pcard-face pcard-back" /> : <span className="pl-empty" />}</div>
            <span className="pl-heap-label">{t('Stock · {n}', { n: view.stock })}</span>
          </div>
          <div className="pl-heap main">
            <Pile cards={view.pile} fresh={fresh} ghost={ghost} />
            <span className="pl-heap-label">{t('Pile · {n}', { n: view.pileCount })}</span>
          </div>
        </div>
        <span className="pl-need">{view.phase === 'setup' ? t('Everyone picks their face-up cards') : needText(view.need)}</span>
        {view.burned > 0 && <span className="pl-burned">{t('Cleared away: {n}', { n: view.burned })}</span>}
        {ghost?.kind === 'burn' && (
          <span key={ghost.id} className="pl-flash">
            🔥 {t('Cleared!')}
          </span>
        )}
      </section>

      <div className="pl-status">
        <span className="pl-status-text">{view.phase === 'setup' ? t('Choose your face-up cards on your phone') : turnText(view)}</span>
        {last && (
          <span key={view.log.length + JSON.stringify(last)} className="pl-last pop-in">
            {entryText(last, view)}
          </span>
        )}
      </div>
    </div>
  );
}

const tiltOf = (c: Card) => ((c.value * 7 + c.suit.length * 3) % 11) - 5;

/**
 * The top cards of the pile, a little messy, top card on top. Cards just played land on it one after
 * the other; a cleared or taken pile flies off.
 */
function Pile({ cards, fresh, ghost }: { cards: Card[]; fresh: number; ghost: { cards: Card[]; kind: 'burn' | 'take'; id: string } | null }) {
  return (
    <div className="pl-stack pl-pile">
      {!cards.length && <span className="pl-empty" />}
      {cards.map((c, i) => {
        const k = i - (cards.length - fresh);
        return (
          <span
            key={`${c.value}${c.suit}`}
            className={`pl-pile-card${k >= 0 ? ' land' : ''}`}
            style={{ '--d': cards.length - 1 - i, '--tilt': `${tiltOf(c)}deg`, animationDelay: k > 0 ? `${k * 110}ms` : undefined } as CSSProperties}
          >
            <CardFace card={c} />
          </span>
        );
      })}
      {ghost &&
        ghost.cards.map((c, i) => (
          <span
            key={`${ghost.id}${c.value}${c.suit}`}
            className={`pl-pile-card ghost ${ghost.kind}`}
            style={{ '--d': ghost.cards.length - 1 - i, '--tilt': `${tiltOf(c)}deg`, animationDelay: `${i * 50}ms` } as CSSProperties}
          >
            <CardFace card={c} />
          </span>
        ))}
    </div>
  );
}

/** Three face-down cards with the face-up ones on top. */
function Palace3({
  up,
  down,
  onUp,
  onDown,
  selected,
  leaving,
  pick,
}: {
  up: (Card | null)[];
  down: boolean[];
  onUp?: (c: Card) => void;
  onDown?: (i: number) => void;
  selected?: (c: Card) => boolean;
  leaving?: (c: Card) => boolean;
  pick?: 'up' | 'down' | null;
}) {
  return (
    <div className={`pl-palace${pick ? ` pick-${pick}` : ''}`}>
      {Array.from({ length: TABLE }, (_, i) => {
        const u = up[i] ?? null;
        return (
          <div key={i} className="pl-slot">
            {down[i] ? (
              <button type="button" className="pl-slot-down" disabled={pick !== 'down'} onClick={() => onDown?.(i)} aria-label={t('Face-down card')}>
                <span className="pcard-face pcard-back" />
              </button>
            ) : (
              <span className="pl-slot-gone" />
            )}
            {u && (
              <button
                type="button"
                className={`pl-slot-up${selected?.(u) ? ' selected' : ''}${leaving?.(u) ? ' leaving' : ''}`}
                disabled={pick !== 'up'}
                onClick={() => onUp?.(u)}
                aria-label={cardName(u)}
              >
                <CardFace card={u} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Setup: three hand cards go face up ---------------- */

function Setup({ view, act }: { view: PhoneView; act: (a: Act) => void }) {
  const known = useApp().knows('palace');
  const [chosen, setChosen] = useState<Card[]>([]);
  const mine = view.sides[view.me];
  const hand = sorted(view.hand);
  const waiting = view.sides.filter((s) => !s.ready).length;

  if (mine.ready) {
    return (
      <div className="pl pl-player fill">
        <div className="pl-status">
          <span className="pl-status-text">{t('Waiting for the others… ({n} still choosing)', { n: waiting })}</span>
        </div>
        <div className="pl-mine">
          <Palace3 up={mine.up} down={mine.down} />
        </div>
        <HandSpread cards={hand} />
      </div>
    );
  }

  const toggle = (c: Card) => {
    sfx.pop();
    buzz(10);
    setChosen((x) => (x.some((y) => same(y, c)) ? x.filter((y) => !same(y, c)) : x.length < TABLE ? [...x, c] : x));
  };

  return (
    <div className="pl pl-player fill">
      <div className="pl-status mine">
        <span className="pl-status-text">{t('Pick 3 cards to lay face up')}</span>
        {!known && <span className="pl-status-sub">{t('Usually your best: high cards, 2s, 3s and 10s. You play them once your hand is gone.')}</span>}
      </div>
      <div className="pl-mine">
        <Palace3 up={[...chosen, null, null, null].slice(0, TABLE)} down={mine.down} />
      </div>
      <HandSpread cards={hand} isSelected={(c) => chosen.some((y) => same(y, c))} onTap={toggle} />
      <div className="pl-actions">
        <BigButton size="xl" disabled={chosen.length !== TABLE} onClick={() => act({ t: 'setup', up: chosen })}>
          {chosen.length === TABLE ? t('Lay them face up') : t('{n} of 3 picked', { n: chosen.length })}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------------- A player's phone ---------------- */

const sorted = (cards: Card[]) => [...cards].sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit));

function PlayerView({ view, act, connected }: { view: PhoneView; act: (a: Act) => void; connected: boolean }) {
  const known = useApp().knows('palace');
  const [sel, setSel] = useState<Card[]>([]);
  // Cards on their way to the pile: they fly up first, then the move is sent.
  const [leaving, setLeaving] = useState<Card[]>([]);
  const mine = view.sides[view.me];
  const myTurn = view.turn === view.me && view.phase === 'play';
  const hand = sorted(view.hand);
  const up = mine.up.filter((c): c is Card => !!c);
  const zone = hand.length ? 'hand' : up.length ? 'up' : mine.down.some(Boolean) ? 'down' : null;
  const from = zone === 'hand' ? hand : zone === 'up' ? up : [];
  const count = (v: number) => from.filter((c) => c.value === v).length;
  const ok = (c: Card) => fits(view.need, c.value, count(c.value));
  const can = zone === 'down' || from.some(ok);
  const selFits = sel.length > 0 && fits(view.need, sel[0].value, sel.length);

  // A new state (someone moved) clears the selection.
  const key = JSON.stringify([view.pile, view.hand, view.turn, view.log]);
  useEffect(() => {
    setSel([]);
    setLeaving([]);
  }, [key]);
  const reveal = useReveal(view);

  const tap = (c: Card) => {
    if (!myTurn) return;
    if (!ok(c)) {
      buzz([30, 30, 30]);
      return;
    }
    sfx.pop();
    buzz(10);
    setSel((x) => {
      if (x.some((y) => same(y, c))) return x.filter((y) => !same(y, c));
      // Only four of a kind fits? Then pick up all four at once.
      if (!fits(view.need, c.value)) return from.filter((y) => y.value === c.value);
      return x.length && x[0].value === c.value ? [...x, c] : [c];
    });
  };
  const send = (a: Act) => {
    setSel([]);
    act(a);
  };
  const play = () => {
    if (!selFits || leaving.length) return;
    const cards = sel;
    setLeaving(cards);
    setSel([]);
    window.setTimeout(() => act({ t: 'play', cards }), 220);
  };
  const isLeaving = (c: Card) => leaving.some((y) => same(y, c));

  const top = view.pile.at(-1);
  let headline: string;
  if (view.phase === 'over') headline = t('Game over');
  else if (!myTurn) headline = turnText(view);
  else if (view.again) headline = t('Go again!');
  else if (!can) headline = t('You can’t play');
  else if (zone === 'down') headline = t('Turn over a face-down card');
  else headline = t('Your turn!');

  const last = view.log.at(-1);

  return (
    <div className="pl pl-player fill">
      <div className={`pl-status${myTurn ? ' mine' : ''}`}>
        <div className="pl-status-top">
          <span className="pl-mini" key={top ? `${top.value}${top.suit}` : 'empty'}>
            {top ? <CardFace card={top} /> : <span className="pl-empty" />}
          </span>
          <span className="pl-status-need">
            {needText(view.need)}
            <small>{t('Stock · {n}', { n: view.stock })}</small>
          </span>
        </div>
        <span className="pl-status-text">{headline}</span>
        {last && (!myTurn || view.again) && <span className="pl-status-sub">{entryText(last, view)}</span>}
      </div>

      <div className="pl-mine">
        <Palace3
          up={mine.up}
          down={mine.down}
          pick={myTurn ? (zone === 'up' ? 'up' : zone === 'down' ? 'down' : null) : null}
          selected={(c) => sel.some((y) => same(y, c))}
          leaving={isLeaving}
          onUp={tap}
          onDown={(i) => send({ t: 'blind', i })}
        />
      </div>

      <HandSpread
        cards={hand}
        isSelected={(c) => sel.some((y) => same(y, c))}
        isLeaving={isLeaving}
        isDim={myTurn && zone === 'hand' ? (c) => !ok(c) : undefined}
        onTap={zone === 'hand' ? tap : undefined}
        empty={zone === 'up' ? t('Hand empty: play your face-up cards') : zone === 'down' ? t('Hand empty: play your face-down cards, blind') : undefined}
      />

      <div className="pl-actions">
        {myTurn && !connected ? (
          <BigButton variant="glass" disabled>
            {t('Reconnecting…')}
          </BigButton>
        ) : myTurn && zone === 'down' ? (
          !known && <p className="pl-hint">{t('Tap one of your face-down cards. If it doesn’t fit, you take the pile.')}</p>
        ) : myTurn ? (
          <div className="pl-action-row">
            {can ? (
              <BigButton disabled={!selFits || leaving.length > 0} onClick={play}>
                {selFits ? t('Play {cards}', { cards: group(sel) }) : t('Pick cards')}
              </BigButton>
            ) : (
              <BigButton variant="danger" onClick={() => send({ t: 'take' })}>
                {t('Take the pile ({n})', { n: view.pileCount })}
              </BigButton>
            )}
            {/* Risking is always allowed while the stock lasts: keep your good cards. */}
            {zone === 'hand' && view.stock > 0 && (
              <BigButton variant="light" className="pl-risk" disabled={leaving.length > 0} onClick={() => send({ t: 'risk' })}>
                {t('Risk it 🎲')}
              </BigButton>
            )}
          </div>
        ) : null}
        {myTurn && can && zone !== 'down' && !selFits && !known && <p className="pl-hint">{t('Pick one or more cards of one value')}</p>}
        {myTurn && !can && zone === 'hand' && view.stock > 0 && !known && (
          <p className="pl-hint">{t('Risk it: the top card of the stock goes on the pile. If it doesn’t fit, you take the pile and that card.')}</p>
        )}
      </div>
      {reveal && <Reveal key={reveal.id} {...reveal} />}
    </div>
  );
}

interface RevealInfo {
  id: string;
  card: Card;
  /** Was face down (blind card, risked card): it turns over. */
  flip: boolean;
  text: string;
  good: boolean;
}

/** Your own blind or risked card, a cleared pile or a play-again: shown big for a moment. */
function useReveal(view: PhoneView): RevealInfo | null {
  const seen = useRef(JSON.stringify(view.log.at(-1) ?? null));
  const [info, setInfo] = useState<RevealInfo | null>(null);
  useEffect(() => {
    const e = view.log.at(-1);
    const id = JSON.stringify(e ?? null);
    if (id === seen.current) return;
    seen.current = id;
    if (!e || e.by !== view.me) return;
    if (e.k === 'take') {
      if (e.failed && e.how) setInfo({ id, card: e.failed, flip: true, good: false, text: t('Doesn’t fit: you take the pile') });
      return;
    }
    const flip = e.from === 'down' || e.from === 'risk';
    const text = e.burn ? t('The pile is cleared! Go again.') : e.again ? t('Go again!') : flip ? t('It fits!') : '';
    if (flip || text) setInfo({ id, card: e.cards[0], flip, good: true, text });
  }, [view.log, view.me]);
  useEffect(() => {
    if (!info) return;
    const timer = window.setTimeout(() => setInfo(null), 1700);
    return () => window.clearTimeout(timer);
  }, [info]);
  return info;
}

function Reveal({ card, flip, text, good }: RevealInfo) {
  return (
    <div className={`pl-reveal${good ? ' good' : ' bad'}`} aria-live="polite">
      <div className={`pl-reveal-card${flip ? ' flip' : ''}`}>
        <div className="pl-reveal-inner">
          <CardFace card={card} />
          <span className="pcard-face pcard-back" />
        </div>
      </div>
      {text && <span className="pl-reveal-text">{text}</span>}
    </div>
  );
}

/**
 * Your hand, spread out to fill the space: one row while it fits, more rows (overlapping, so each
 * card's corner shows) once the hand grows. Cards get as big as the space allows.
 */
function HandSpread({
  cards,
  isSelected,
  isLeaving,
  isDim,
  onTap,
  empty,
}: {
  cards: Card[];
  isSelected?: (c: Card) => boolean;
  isLeaving?: (c: Card) => boolean;
  isDim?: (c: Card) => boolean;
  onTap?: (c: Card) => void;
  empty?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 320, h: 220 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = cards.length;
  const LIFT = 18;
  const SHOW = 0.4; // how much of a card in a back row stays visible
  const MAX_TILT = 9; // degrees, for the outer cards of a one-row fan
  let best = { rows: 1, per: Math.max(1, n), cw: 0 };
  for (let rows = 1; rows <= Math.min(4, Math.max(1, n)); rows++) {
    const per = Math.ceil(n / rows);
    const byH = (box.h - LIFT) / (1.4 * (1 + (rows - 1) * SHOW));
    // A fanned row needs some room at the sides for the tilted outer cards.
    const byW = box.w / (1 + (per - 1) * 0.38 + (rows === 1 && per > 1 ? 0.3 : 0));
    const cw = Math.min(140, byH, byW);
    if (cw > best.cw + 4) best = { rows, per, cw };
  }
  const { rows, per, cw } = best;
  const ch = cw * 1.4;
  const shift = ch * SHOW;
  const height = ch + (rows - 1) * shift;
  const fan = rows === 1 && n > 1;
  const pad = fan ? cw * 0.15 : 0;
  // Held at the bottom, like a real hand (the outer cards of a fan dip a little lower).
  const top0 = Math.max(LIFT, box.h - height - 4 - (fan ? cw * 0.1 : 0));

  return (
    <div ref={ref} className="pl-hand">
      {n === 0 && empty && <p className="pl-hand-empty">{empty}</p>}
      {cards.map((c, i) => {
        const row = Math.floor(i / per);
        const col = i % per;
        const inRow = Math.min(per, n - row * per);
        const step = inRow > 1 ? Math.min(cw + 8, (box.w - 2 * pad - cw) / (inRow - 1)) : 0;
        const left = (box.w - (cw + step * (inRow - 1))) / 2 + col * step;
        const mid = (inRow - 1) / 2;
        // One row: a gentle fan like a hand of cards.
        const tilt = fan ? Math.min(MAX_TILT, 2.2 * (inRow - 1)) : 0;
        const angle = fan ? ((col - mid) / mid) * tilt : 0;
        const drop = fan ? ((col - mid) / mid) ** 2 * cw * 0.08 : 0;
        const sel = isSelected?.(c) ?? false;
        const gone = isLeaving?.(c) ?? false;
        return (
          <button
            key={`${c.value}${c.suit}`}
            type="button"
            className={`pl-card${sel ? ' selected' : ''}${isDim?.(c) ? ' dim' : ''}`}
            style={
              {
                '--cw': `${cw}px`,
                left,
                top: top0 + row * shift,
                transform: gone ? `translateY(${-ch * 0.9}px) scale(0.85)` : `translateY(${sel ? -LIFT : drop}px) rotate(${angle}deg)`,
                opacity: gone ? 0 : undefined,
                zIndex: i + 1,
              } as CSSProperties
            }
            disabled={!onTap}
            onClick={() => onTap?.(c)}
            aria-label={cardName(c)}
          >
            <CardFace card={c} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Game over ---------------- */

function Over({ view, isHost, onNewGame }: { view: PhoneView; isHost: boolean; onNewGame: () => void }) {
  const w = view.winner!;
  const order = view.seats
    .map((s, i) => ({ s, i, left: view.sides[i].hand + view.sides[i].up.filter(Boolean).length + view.sides[i].down.filter(Boolean).length }))
    .filter((x) => x.i !== w)
    .sort((a, b) => b.left - a.left);
  return (
    <div className="pl-over">
      <div className="pl-over-card">
        <span className="kicker">{t('Game over')}</span>
        <h2 className="bd-title big">{w === view.me ? t('You win!') : t('{name} wins!', { name: nameOf(view, w) })}</h2>
        <ul className="pl-over-list">
          {order.map(({ s, i, left }) => (
            <li key={s.id}>
              <span>
                {s.avatar} {i === view.me ? t('You') : s.name}
              </span>
              <strong>{t('{n} cards left', { n: left })}</strong>
            </li>
          ))}
        </ul>
        {isHost ? (
          <BigButton size="xl" onClick={onNewGame}>
            {t('New game')}
          </BigButton>
        ) : (
          <p className="lead center">{t('Waiting for the host…')}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Sound & vibration ---------------- */

function useFeedback(view: PhoneView | null) {
  const prev = useRef<PhoneView | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    if (!view || !before || view.phase === 'setup') return;
    const myTurn = view.me >= 0 && view.turn === view.me && view.phase === 'play';
    if (myTurn && (before.turn !== view.me || before.phase !== 'play')) {
      sfx.tick();
      buzz([60, 40, 60]);
    }
    const last = view.log.at(-1);
    if (last && JSON.stringify(last) !== JSON.stringify(before.log.at(-1))) {
      if (last.k === 'take') {
        if (view.me < 0 || last.by === view.me) {
          sfx.boo();
          buzz([80, 60, 160]);
        }
      } else if (last.burn) {
        sfx.pop();
        buzz(40);
      }
    }
    if (view.phase === 'over' && before.phase !== 'over') {
      if (view.winner === view.me || view.me < 0) celebrate();
      else {
        sfx.boo();
        buzz([80, 60, 200]);
      }
    }
  }, [view]);
}
