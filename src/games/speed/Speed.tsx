import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { SUITS, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { load, save } from '../../lib/storage';
import { useRoom } from '../../net/RoomProvider';
import { useApp } from '../../state/AppState';
import { draw, HAND_MAX, markReady, newGame, overDrawn, play, putBack, stuck, targetFor, turnOver, type Game, type Who } from './logic';

/* ---------------- Messages between phones ---------------- */

interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

/** The whole match as the host keeps it. Every phone gets all of it: opponents' cards are never drawn face up. */
interface Match {
  game: Game;
  seats: [Seat, Seat];
  /** 3-2-1 while the middle cards are about to be turned over. */
  count: number;
}

type Act = { t: 'ready' } | { t: 'draw' } | { t: 'back' } | { t: 'play'; card: Card };

type Msg = { g: 'sp'; type: 'state'; match: Match | null } | { g: 'sp'; type: 'act'; act: Act } | { g: 'sp'; type: 'sync' };

const isMsg = (d: unknown): d is Msg => typeof d === 'object' && d !== null && (d as Msg).g === 'sp';

const STORE_KEY = 'speed:match';
const COUNT_MS = 650;

function apply(m: Match, fromId: string, act: Act): Match {
  const who = m.seats.findIndex((s) => s.id === fromId);
  if (who < 0) return m;
  const w = who as Who;
  const g = m.game;
  let next = g;
  if (act.t === 'ready') next = markReady(g, w);
  if (act.t === 'draw') next = draw(g, w);
  if (act.t === 'back') next = putBack(g, w);
  if (act.t === 'play') {
    // By card, not position: the hand may have grown while the move was on its way.
    const i = g.sides[w].hand.findIndex((c) => c.value === act.card.value && c.suit === act.card.suit);
    if (i >= 0) next = play(g, w, i);
  }
  return next === g ? m : { ...m, game: next, count: next.phase === 'count' && g.phase !== 'count' ? 3 : m.count };
}

/**
 * Host phone: owns the match, applies both players' moves in the order they arrive and sends
 * everyone the new state. It also runs the 3-2-1 whenever nobody can play.
 */
function useSpeed() {
  const room = useRoom();
  const isHost = room.role === 'host';
  const myId = room.myId ?? '';
  const { onGame, sendTo, sendToHost, members, code } = room;
  const [hostMatch, setHostMatch] = useState<Match | null>(null);
  const [guestMatch, setGuestMatch] = useState<Match | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (!isHost || !code || restored.current) return;
    restored.current = true;
    const saved = load<{ code: string; match: Match } | null>(STORE_KEY, null);
    if (saved?.code === code) setHostMatch(saved.match);
  }, [isHost, code]);

  useEffect(() => {
    if (isHost && code && restored.current) save(STORE_KEY, hostMatch ? { code, match: hostMatch } : null);
  }, [isHost, code, hostMatch]);

  const act = useCallback(
    (a: Act) => {
      if (isHost) setHostMatch((m) => (m ? apply(m, myId, a) : m));
      else sendToHost({ g: 'sp', type: 'act', act: a } satisfies Msg);
    },
    [isHost, myId, sendToHost],
  );

  // Host: hear the guests.
  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (!isMsg(data) || !fromId) return;
      if (data.type === 'act') setHostMatch((m) => (m ? apply(m, fromId, data.act) : m));
    });
  }, [isHost, onGame]);

  // Host: everyone gets the new state.
  useEffect(() => {
    if (!isHost) return;
    for (const m of members) if (m.id !== myId && m.online) sendTo(m.id, { g: 'sp', type: 'state', match: hostMatch } satisfies Msg);
  }, [isHost, hostMatch, members, myId, sendTo]);

  // Host: the 3-2-1.
  const counting = isHost && hostMatch?.game.phase === 'count';
  useEffect(() => {
    if (!counting) return;
    const id = window.setInterval(() => {
      setHostMatch((m) => {
        if (!m || m.game.phase !== 'count') return m;
        return m.count > 1 ? { ...m, count: m.count - 1 } : { ...m, game: turnOver(m.game), count: 0 };
      });
    }, COUNT_MS);
    return () => window.clearInterval(id);
  }, [counting]);

  // Host: nobody can play – show it for a moment, then count down to two new middle cards.
  const isStuck = isHost && !!hostMatch && stuck(hostMatch.game);
  useEffect(() => {
    if (!isStuck) return;
    const id = window.setTimeout(
      () => setHostMatch((m) => (m && stuck(m.game) ? { ...m, game: { ...m.game, phase: 'count' }, count: 3 } : m)),
      1700,
    );
    return () => window.clearTimeout(id);
  }, [isStuck]);

  // Guest: receive the state, and ask for it when this screen opens.
  useEffect(() => {
    if (isHost) return;
    const off = onGame((data) => {
      if (isMsg(data) && data.type === 'state') setGuestMatch(data.match);
    });
    sendToHost({ g: 'sp', type: 'sync' } satisfies Msg);
    return off;
  }, [isHost, onGame, sendToHost]);

  // Host: answer a sync.
  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (isMsg(data) && data.type === 'sync' && fromId) sendTo(fromId, { g: 'sp', type: 'state', match: hostMatch } satisfies Msg);
    });
  }, [isHost, onGame, sendTo, hostMatch]);

  return { room, isHost, myId, match: isHost ? hostMatch : guestMatch, act, setHostMatch };
}

/* ---------------- Screen ---------------- */

export default function Speed() {
  const { room, isHost, myId, match, act, setHostMatch } = useSpeed();
  const known = useApp().knows('speed');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);

  // Confetti for the winner (and whoever's watching), not for the one who lost.
  const winner = match?.game.winner;
  const winnerId = winner != null ? match?.seats[winner].id : null;
  const lost = winnerId != null && winnerId !== myId && match?.seats.some((x) => x.id === myId);
  useEffect(() => {
    if (winnerId == null) return;
    if (lost) {
      sfx.boo();
      buzz([80, 60, 200]);
    } else celebrate();
  }, [winnerId, lost]);

  // Count sounds on every phone.
  const count = match?.game.phase === 'count' ? match.count : 0;
  useEffect(() => {
    if (count > 0) {
      sfx.tick();
      buzz(15);
    }
  }, [count]);

  /* ---------- Lobby ---------- */
  if (!match) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <div className="connecting-emoji">⚡</div>
            <h2 className="bd-title">{t('Speed')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to deal…', { name: host.name }) : t('Waiting for the host to deal…')}</p>
          </div>
        </div>
      );
    }
    // Two play; whoever else is in the room watches the table. Default: the first two phones.
    const chosen = (picked.length ? picked : online.slice(0, 2).map((m) => m.id)).filter((id) => online.some((m) => m.id === id));
    const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-2));
    const seats = chosen.map((id) => online.find((m) => m.id === id)!).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }));
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('A duel for two')}</span>
          <h2 className="bd-title big">{t('Speed')}</h2>
          {!known && <p className="lead">{t('Both play at the same time, each on their own phone. Get rid of all your cards first.')}</p>}
        </div>
        <h3 className="section-title">{t('Who plays?')}</h3>
        <div className="pick-grid">
          {online.map((m) => (
            <Tap
              key={m.id}
              className={`pick-chip${chosen.includes(m.id) ? ' selected' : ''}`}
              style={{ '--chip': m.color } as CSSProperties}
              onClick={() => toggle(m.id)}
            >
              <span className="pick-chip-avatar">{m.avatar}</span>
              <span className="pick-chip-name">{m.name}</span>
            </Tap>
          ))}
        </div>
        {!known && online.length > 2 && <p className="fine-print">{t('Everyone else watches the table.')}</p>}
        <div className="sticky-action">
          <BigButton
            size="xl"
            disabled={seats.length < 2}
            onClick={() => setHostMatch({ game: newGame(), seats: [seats[0], seats[1]], count: 0 })}
          >
            {online.length < 2 ? t('Waiting for players…') : seats.length < 2 ? t('Pick two players') : t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  const g = match.game;
  const me = match.seats.findIndex((s) => s.id === myId);
  const playing = me >= 0;
  const mine = (playing ? me : 0) as Who;
  const them = (mine === 0 ? 1 : 0) as Who;

  const nope = (i: number) => {
    buzz([30, 30, 30]);
    setShake(`${i}-${Date.now()}`);
  };

  const tapCard = (i: number) => {
    const side = g.sides[mine];
    const card = side.hand[i];
    if (overDrawn(side)) {
      // Only the last extra card can go back first, so the pile ends up in order.
      if (i === side.hand.length - 1) {
        sfx.tick();
        buzz(10);
        act({ t: 'back' });
      } else nope(i);
      return;
    }
    if (g.phase !== 'play' || targetFor(g, card) == null) return nope(i);
    sfx.pop();
    buzz(12);
    act({ t: 'play', card });
  };

  const tapPile = () => {
    if (!g.sides[mine].pile.length || g.phase === 'over') return;
    sfx.tick();
    buzz(8);
    act({ t: 'draw' });
  };

  return (
    <div className={`sp${playing ? '' : ' watching'}`}>
      {playing ? (
        <Opponent g={g} who={them} seat={match.seats[them]} />
      ) : (
        <>
          <Opponent g={g} who={1} seat={match.seats[1]} />
          <Opponent g={g} who={0} seat={match.seats[0]} />
        </>
      )}

      <Middle g={g} count={g.phase === 'count' ? match.count : null} />

      {playing && (
        <MyHalf
          g={g}
          who={mine}
          other={match.seats[them].name}
          known={known}
          shake={shake}
          onCard={tapCard}
          onPile={tapPile}
          onReady={() => act({ t: 'ready' })}
        />
      )}

      {g.phase === 'over' && (
        <div className="sp-over">
          <p className="sp-result">
            {g.winner === me ? t('You win! 🏆') : t('{name} wins!', { name: match.seats[g.winner ?? 0].name })}
          </p>
          {isHost ? (
            <>
              <BigButton onClick={() => setHostMatch({ game: newGame(), seats: match.seats, count: 0 })}>{t('Rematch')}</BigButton>
              <BigButton variant="glass" onClick={() => setHostMatch(null)}>
                {t('Pick other players')}
              </BigButton>
            </>
          ) : (
            <p className="lead center">{t('Waiting for the host…')}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** The other player: how many cards they have left, their hand face down. */
function Opponent({ g, who, seat }: { g: Game; who: Who; seat: Seat }) {
  const side = g.sides[who];
  const left = side.hand.length + side.pile.length;
  return (
    <div className="sp-opp" style={{ '--chip': seat.color } as CSSProperties}>
      <span className="bd-avatar xs" style={{ background: seat.color }}>
        {seat.avatar}
      </span>
      <span className="sp-name">{seat.name}</span>
      <span className="sp-opp-hand" aria-label={t('{n} cards in hand', { n: side.hand.length })}>
        {side.hand.map((_, i) => (
          <i key={i} className={i >= HAND_MAX ? 'extra' : ''} />
        ))}
      </span>
      <span className="sp-left">{left === 1 ? t('1 card left') : t('{n} cards left', { n: left })}</span>
      {g.phase === 'ready' && <span className={`sp-opp-ready${g.ready[who] ? ' on' : ''}`}>{g.ready[who] ? t('Ready') : '…'}</span>}
    </div>
  );
}

/** Your side: your pile to draw from and the cards in your hand. */
function MyHalf({
  g,
  who,
  other,
  known,
  shake,
  onCard,
  onPile,
  onReady,
}: {
  g: Game;
  who: Who;
  other: string;
  known: boolean;
  shake: string | null;
  onCard: (i: number) => void;
  onPile: () => void;
  onReady: () => void;
}) {
  const side = g.sides[who];
  const left = side.hand.length + side.pile.length;
  const extra = side.hand.length - HAND_MAX;
  return (
    <section className="sp-mine">
      {extra > 0 && <p className="sp-warn">{extra === 1 ? t('Too many cards! Put 1 back.') : t('Too many cards! Put {n} back.', { n: extra })}</p>}

      <div className={`sp-hand${side.hand.length > HAND_MAX ? ' crowded' : ''}`}>
        {side.hand.map((c, i) => {
          const isExtra = i >= HAND_MAX;
          return (
            <button
              key={`${c.value}${c.suit}`}
              type="button"
              className={`sp-card${isExtra ? ' extra' : ''}${isExtra && i === side.hand.length - 1 ? ' back-next' : ''}${shake?.startsWith(`${i}-`) ? ' nope' : ''}`}
              onPointerDown={() => onCard(i)}
              aria-label={isExtra ? t('Put this card back') : t('Play this card')}
            >
              <CardFace card={c} />
            </button>
          );
        })}
        {!side.hand.length && g.phase !== 'over' && <span className="sp-hand-empty">{t('Draw from your pile')}</span>}
      </div>

      <div className="sp-info">
        <button type="button" className={`sp-pile${side.pile.length ? '' : ' empty'}`} onPointerDown={onPile} aria-label={t('Draw a card')}>
          {side.pile.length > 0 && <span className="sp-pile-count">{side.pile.length}</span>}
        </button>
        <span className="sp-info-text">
          <span className="sp-left">{left === 1 ? t('1 card left') : t('{n} cards left', { n: left })}</span>
          {!known && g.phase !== 'over' && <span className="sp-info-hint">{t('Tap your pile to draw. Never more than 5 in your hand.')}</span>}
        </span>
      </div>

      {g.phase === 'ready' && (
        <div className="sticky-action sp-ready">
          {!known && <p className="sp-ready-hint">{t('Tap a card to put it on a middle pile that’s one higher or lower. Ace goes on King or 2.')}</p>}
          {g.ready[who] ? (
            <BigButton variant="glass" disabled>
              {t('Waiting for {name}…', { name: other })}
            </BigButton>
          ) : (
            <BigButton size="xl" onClick={onReady}>
              {t('Ready')}
            </BigButton>
          )}
        </div>
      )}
    </section>
  );
}

/** The middle of the table: the two side stacks and the two piles everyone plays on. */
function Middle({ g, count }: { g: Game; count: number | null }) {
  // Every phone works this out from the same state, so everyone sees it at once.
  const nobody = stuck(g);
  const restart = g.middle[0].length > 0 || g.middle[1].length > 0;
  return (
    <div className="sp-middle">
      <span className={`sp-stack${g.stacks[0].length ? '' : ' empty'}`}>{g.stacks[0].length || ''}</span>
      {g.middle.map((pile, p) => (
        <span key={p} className="sp-mid-pile">
          {pile.slice(-3).map((c, i, shown) => (
            <span key={`${c.value}${c.suit}`} className={`sp-mid-card${i === shown.length - 1 ? ' top' : ''}`} style={{ '--tilt': `${wobble(c) * 14}deg` } as CSSProperties}>
              <CardFace card={c} />
            </span>
          ))}
        </span>
      ))}
      <span className={`sp-stack${g.stacks[1].length ? '' : ' empty'}`}>{g.stacks[1].length || ''}</span>
      {nobody && (
        <span className="sp-stuck">
          <span className="sp-stuck-title">{t('Nobody can play!')}</span>
          <span className="sp-stuck-sub">{t('Two new cards are coming…')}</span>
        </span>
      )}
      {count != null && count > 0 && (
        <span className="sp-count" key={count}>
          {restart && <span className="sp-count-label">{t('New cards in')}</span>}
          {count}
        </span>
      )}
    </div>
  );
}

/** A small number from a card, stable across renders: every card keeps its own crooked angle. */
function wobble(card: Card) {
  const h = Math.imul(card.value * 97 + SUITS.indexOf(card.suit) * 31 + 7919, 2654435761) >>> 0;
  return (h % 1000) / 1000 - 0.5;
}
