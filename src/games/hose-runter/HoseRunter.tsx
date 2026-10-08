import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { cardName, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { load, save } from '../../lib/storage';
import { useRoom } from '../../net/RoomProvider';
import {
  applyAction,
  formatPoints,
  MAX_PLAYERS,
  MIN_PLAYERS,
  newGame,
  scoreHand,
  START_LIVES,
  viewFor,
  type Action,
  type GameState,
  type LogEntry,
  type PlayerView,
  type Score,
  type Seat,
} from './logic';

/* ---------------- Messages between phones ---------------- */

type Msg =
  | { g: 'hr'; type: 'view'; view: PlayerView | null }
  | { g: 'hr'; type: 'action'; action: Action }
  | { g: 'hr'; type: 'sync' };

const isMsg = (d: unknown): d is Msg => typeof d === 'object' && d !== null && (d as Msg).g === 'hr';

const STORE_KEY = 'hose-runter:game';

/**
 * Host phone: owns the real game state, applies everyone's actions and sends each phone
 * only what it may see. Guests: show the view they get and send their actions to the host.
 */
function useHoseRunter() {
  const room = useRoom();
  const isHost = room.role === 'host';
  const myId = room.myId ?? '';
  const { onGame, sendTo, sendToHost, members, code } = room;

  const [state, setState] = useState<GameState | null>(null);
  const [guestView, setGuestView] = useState<PlayerView | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const restored = useRef(false);

  // Host: the game survives a reload of the host phone (the room reopens with the same code).
  useEffect(() => {
    if (!isHost || !code || restored.current) return;
    restored.current = true;
    const saved = load<{ code: string; state: GameState } | null>(STORE_KEY, null);
    if (saved?.code === code) setState(saved.state);
  }, [isHost, code]);

  useEffect(() => {
    if (isHost && code && restored.current) save(STORE_KEY, state ? { code, state } : null);
  }, [isHost, code, state]);

  // Guest moves wait for the host's answer (a new view). If none comes, e.g. because the
  // connection blinked, the move is sent again. Safe: the host ignores a move that's no
  // longer valid, so a move that did arrive can't be applied twice.
  const pending = useRef<{ action: Action; tries: number; timer?: number } | null>(null);
  const clearPending = () => {
    window.clearTimeout(pending.current?.timer);
    pending.current = null;
  };
  const sendPending = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    sendToHost({ g: 'hr', type: 'action', action: p.action } satisfies Msg);
    p.tries++;
    if (p.tries < 5) p.timer = window.setTimeout(sendPending, 3000);
    else pending.current = null;
  }, [sendToHost]);

  const act = useCallback(
    (action: Action) => {
      if (isHost) {
        setState((s) => (s ? applyAction(s, myId, action) : s));
        return;
      }
      clearPending();
      pending.current = { action, tries: 0 };
      sendPending();
    },
    [isHost, myId, sendPending],
  );

  // Host: hear guests' actions.
  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (!isMsg(data) || !fromId) return;
      if (data.type === 'action') setState((s) => (s ? applyAction(s, fromId, data.action) : s));
      if (data.type === 'sync') {
        const s = stateRef.current;
        sendTo(fromId, { g: 'hr', type: 'view', view: s ? viewFor(s, fromId) : null } satisfies Msg);
      }
    });
  }, [isHost, onGame, sendTo]);

  // Host: send every phone its own view whenever something changes (or someone reconnects).
  useEffect(() => {
    if (!isHost) return;
    for (const m of members) {
      if (m.id === myId || !m.online) continue;
      sendTo(m.id, { g: 'hr', type: 'view', view: state ? viewFor(state, m.id) : null } satisfies Msg);
    }
  }, [isHost, state, members, myId, sendTo]);

  // Guest: receive views, and ask for one when this screen opens.
  useEffect(() => {
    if (isHost) return;
    let last = '';
    const off = onGame((data) => {
      if (!isMsg(data) || data.type !== 'view') return;
      // The host also re-sends unchanged views (e.g. when someone reconnects): only a
      // changed view answers our move.
      const json = JSON.stringify(data.view);
      if (json === last) return;
      last = json;
      clearPending();
      setGuestView(data.view);
    });
    sendToHost({ g: 'hr', type: 'sync' } satisfies Msg);
    return off;
  }, [isHost, onGame, sendToHost]);

  const view = isHost ? (state ? viewFor(state, myId) : null) : guestView;
  const connected = isHost || room.status === 'open';
  return { room, isHost, myId, view, act, setState, connected };
}

/* ---------------- Screen ---------------- */

export default function HoseRunter() {
  const { room, isHost, myId, view, act, setState, connected } = useHoseRunter();
  useFeedback(view, myId);

  if (!view) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="hr">
          <div className="connecting">
            <div className="connecting-emoji">👖</div>
            <h2 className="bd-title">Hose runter</h2>
            <p className="lead">Waiting for {host?.name ?? 'the host'} to deal…</p>
          </div>
        </div>
      );
    }
    const ready = room.members.filter((m) => m.online).slice(0, MAX_PLAYERS);
    return (
      <div className="hr">
        <div className="bd-head">
          <span className="kicker">Every phone plays</span>
          <h2 className="bd-title big">Hose runter</h2>
          <p className="lead">
            Everyone sees only their own cards. Collect points in one suit, don’t end up lowest. {START_LIVES} lives each.
          </p>
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
              <span className="hr-lives">{'♥'.repeat(START_LIVES)}</span>
            </li>
          ))}
        </ul>
        {room.members.filter((m) => m.online).length > MAX_PLAYERS && <p className="notice">Max {MAX_PLAYERS} players. The first {MAX_PLAYERS} play.</p>}
        <p className="fine-print">Turn order is the order above. A random player deals first.</p>
        <div className="sticky-action">
          <BigButton
            size="xl"
            disabled={ready.length < MIN_PLAYERS}
            onClick={() => setState(newGame(ready.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }))))}
          >
            {ready.length < MIN_PLAYERS ? 'Waiting for players…' : 'Deal the cards 🃏'}
          </BigButton>
        </div>
      </div>
    );
  }

  if (view.phase === 'reveal' || view.phase === 'over') {
    return <Reveal view={view} myId={myId} isHost={isHost} onNext={() => act({ type: 'next' })} onNewGame={() => setState(null)} />;
  }
  return <Table view={view} myId={myId} act={act} connected={connected} />;
}

/* ---------------- Table: middle, your hand, actions ---------------- */

function Table({ view, myId, act, connected }: { view: PlayerView; myId: string; act: (a: Action) => void; connected: boolean }) {
  const [pickHand, setPickHand] = useState<number | null>(null);
  const [pickMiddle, setPickMiddle] = useState<number | null>(null);
  const seat = (id: string) => view.seats.find((s) => s.id === id);
  const me = seat(myId);
  const myTurn = view.turnId === myId;
  const dealerPhase = view.phase === 'dealer';
  const dealer = seat(view.dealerId);
  const turnSeat = seat(view.turnId);
  const stopper = view.stopperId ? seat(view.stopperId) : null;
  const score = view.hand.length === 3 ? scoreHand(view.hand) : null;
  const playing = me && !me.out;

  // Clear the selection whenever the table changes.
  const tableKey = JSON.stringify([view.middle, view.hand, view.turnId]);
  useEffect(() => {
    setPickHand(null);
    setPickMiddle(null);
  }, [tableKey]);

  const send = (a: Action) => {
    setPickHand(null);
    setPickMiddle(null);
    act(a);
  };

  let headline: string;
  if (dealerPhase) headline = myTurn ? 'You’re dealing. Keep these cards?' : `${dealer?.name} deals and checks their cards…`;
  else if (myTurn) headline = stopper ? 'Last turn! Swap one or all.' : 'Your turn!';
  else headline = `${turnSeat?.name} is swapping…`;

  return (
    <div className="hr">
      <Seats view={view} myId={myId} />

      <div className={`hr-status${myTurn ? ' mine' : ''}`}>
        <span className="hr-status-round">
          Round {view.round} · {dealer?.name} deals
        </span>
        <span className="hr-status-text">{headline}</span>
        {stopper && <span className="hr-stop-banner">✋ {stopper.id === myId ? 'You' : stopper.name} said STOP</span>}
      </div>

      {!dealerPhase && (
        <section className="hr-zone">
          <span className="hr-zone-label">Middle</span>
          <div className="hr-cards">
            {view.middle.map((c, i) => (
              <CardButton
                key={`m${i}-${cardName(c)}`}
                card={c}
                selected={pickMiddle === i}
                disabled={!myTurn}
                onClick={() => setPickMiddle(pickMiddle === i ? null : i)}
              />
            ))}
          </div>
        </section>
      )}

      {playing ? (
        <section className="hr-zone hand">
          <span className="hr-zone-label">
            Your cards{score && <strong> · {formatPoints(score.points)} points</strong>}
            {score && score.kind !== 'suit' && <ScoreBadge score={score} />}
          </span>
          <div className="hr-cards">
            {view.hand.map((c, i) => (
              <CardButton
                key={`h${i}-${cardName(c)}`}
                card={c}
                selected={pickHand === i}
                disabled={!myTurn || dealerPhase}
                onClick={() => setPickHand(pickHand === i ? null : i)}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="notice">{me ? 'You’re out. Cheer the others on! 🍻' : 'You’re watching this game.'}</p>
      )}

      <LastMove log={view.log} seats={view.seats} myId={myId} />

      {myTurn && playing && !connected && (
        <div className="sticky-action hr-actions">
          <BigButton variant="glass" disabled>
            Reconnecting… 📡
          </BigButton>
        </div>
      )}

      {myTurn && playing && connected && (
        <div className="sticky-action hr-actions">
          {dealerPhase ? (
            <>
              <BigButton size="xl" onClick={() => send({ type: 'keep' })}>
                Keep these 👍
              </BigButton>
              <BigButton variant="glass" onClick={() => send({ type: 'toss' })}>
                Put them in the middle
              </BigButton>
              <p className="fine-print center">In the middle, you must play the next three cards instead, whatever they are.</p>
            </>
          ) : pickHand !== null && pickMiddle !== null ? (
            <BigButton size="xl" onClick={() => send({ type: 'swap1', hand: pickHand, middle: pickMiddle })}>
              Swap {cardName(view.hand[pickHand])} ↔ {cardName(view.middle[pickMiddle])}
            </BigButton>
          ) : (
            <>
              <p className="hr-hint">Tap one of your cards and one in the middle to swap.</p>
              <div className="hr-action-row">
                <BigButton variant="light" onClick={() => send({ type: 'swapAll' })}>
                  Swap all 3
                </BigButton>
                <BigButton variant="danger" disabled={!view.canStop} onClick={() => send({ type: 'stop' })}>
                  {view.firstLap ? 'Stop after round 1' : view.stopperId ? 'Stop called' : 'STOP ✋'}
                </BigButton>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CardButton({ card, selected, disabled, onClick }: { card: Card; selected: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <Tap className={`hr-card${selected ? ' selected' : ''}`} onClick={onClick} disabled={disabled} ariaLabel={cardName(card)}>
      <PlayingCard card={card} size="lg" />
    </Tap>
  );
}

function ScoreBadge({ score }: { score: Score }) {
  const label = { feuer: '🔥 Feuer', hose: '👖 Hose runter', triple: '30½', suit: '' }[score.kind];
  return label ? <span className={`hr-badge ${score.kind}`}>{label}</span> : null;
}

/* ---------------- Players strip ---------------- */

function Seats({ view, myId }: { view: PlayerView; myId: string }) {
  return (
    <div className="hr-seats">
      {view.seats.map((s) => (
        <div
          key={s.id}
          className={`hr-seat${s.id === view.turnId && view.phase !== 'reveal' ? ' turn' : ''}${s.out ? ' out' : ''}`}
          style={{ '--chip': s.color } as CSSProperties}
        >
          <span className="hr-seat-avatar">
            {s.out ? '💀' : s.avatar}
            {s.id === view.dealerId && !s.out && <span className="hr-dealer">D</span>}
            {s.id === view.stopperId && <span className="hr-stopper">✋</span>}
          </span>
          <span className="hr-seat-name">{s.id === myId ? 'You' : s.name}</span>
          <Lives seat={s} />
        </div>
      ))}
    </div>
  );
}

function Lives({ seat }: { seat: Seat }) {
  if (seat.out) return <span className="hr-lives out">out</span>;
  return (
    <span className="hr-lives" aria-label={`${seat.lives} lives`}>
      {'♥'.repeat(Math.max(0, seat.lives))}
    </span>
  );
}

function LastMove({ log, seats, myId }: { log: LogEntry[]; seats: Seat[]; myId: string }) {
  const last = log.at(-1);
  if (!last) return null;
  const who = last.by === myId ? 'You' : seats.find((s) => s.id === last.by)?.name ?? 'Someone';
  const text = {
    keep: `${who} kept the first cards.`,
    toss: `${who} put the first cards in the middle.`,
    swapAll: `${who} swapped all three.`,
    stop: `${who} said STOP. Everyone else gets one more turn.`,
    swap1: last.kind === 'swap1' ? `${who} swapped ${cardName(last.gave)} for ${cardName(last.took)}.` : '',
  }[last.kind];
  return <p key={log.length} className="hr-last pop-in">{text}</p>;
}

/* ---------------- Reveal ---------------- */

function Reveal({ view, myId, isHost, onNext, onNewGame }: { view: PlayerView; myId: string; isHost: boolean; onNext: () => void; onNewGame: () => void }) {
  const r = view.result;
  if (!r) return null;
  const order = Object.keys(r.scores).sort((a, b) => r.scores[b].points - r.scores[a].points);
  const name = (id: string | null) => (id === myId ? 'You' : view.seats.find((s) => s.id === id)?.name ?? '');
  const over = view.phase === 'over';
  const winner = view.winnerId ? view.seats.find((s) => s.id === view.winnerId) : null;

  const title = over
    ? winner
      ? `${winner.id === myId ? 'You win' : `${winner.name} wins`}! 🏆`
      : 'Nobody survived! 💀'
    : r.endedBy === 'feuer'
      ? `🔥 Feuer from ${name(r.by)}!`
      : r.endedBy === 'hose'
        ? `👖 Hose runter from ${name(r.by)}!`
        : 'Cards on the table!';

  return (
    <div className="hr">
      <Seats view={view} myId={myId} />
      <div className="bd-head center">
        <span className="kicker">{over ? 'Game over' : `Round ${view.round}`}</span>
        <h2 className="bd-title big">{title}</h2>
        <p className="lead">
          {r.losers.map(name).join(' & ')} {r.losers.length === 1 && r.losers[0] !== myId ? 'loses' : 'lose'} a life 🍺
        </p>
      </div>

      <ul className="hr-results">
        {order.map((id) => {
          const score = r.scores[id];
          const lost = r.losers.includes(id);
          return (
            <li key={id} className={`hr-result${lost ? ' lost' : ''}${id === r.by ? ' winner' : ''}`}>
              <div className="hr-result-head">
                <span className="hr-result-name">{name(id)}</span>
                <ScoreBadge score={score} />
                <span className="hr-result-points">{formatPoints(score.points)}</span>
              </div>
              <div className="hr-result-cards">
                {r.hands[id].map((c, i) => (
                  <PlayingCard key={i} card={c} size="sm" />
                ))}
                <span className="hr-result-note">
                  {r.out.includes(id) ? 'Out 💀' : r.extraLife.includes(id) ? 'Extra life! ♥' : lost ? '−1 ♥' : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky-action stack">
        {isHost ? (
          over ? (
            <BigButton size="xl" onClick={onNewGame}>
              New game
            </BigButton>
          ) : (
            <BigButton size="xl" onClick={onNext}>
              Next round →
            </BigButton>
          )
        ) : (
          <p className="lead center">{over ? 'Waiting for the host…' : 'Waiting for the host to deal the next round…'}</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Sound & vibration on what happens ---------------- */

function useFeedback(view: PlayerView | null, myId: string) {
  const prev = useRef<PlayerView | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    if (!view || !before) return;
    const becameMyTurn = view.turnId === myId && (before.turnId !== myId || before.phase !== view.phase) && (view.phase === 'turns' || view.phase === 'dealer');
    if (becameMyTurn) {
      sfx.tick();
      buzz([60, 40, 60]);
    }
    if (view.stopperId && !before.stopperId) {
      sfx.boo();
      buzz(120);
    }
    if (view.result && view.result !== before.result && !before.result) {
      if (view.result.endedBy !== 'stop' || view.phase === 'over') celebrate();
      if (view.result.losers.includes(myId)) {
        sfx.boo();
        buzz([80, 60, 200]);
      }
    }
  }, [view, myId]);
}
