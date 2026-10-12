import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { rankLabel, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { recordLoss, recordSips } from '../../lib/stats';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import { layRing, type Slot } from '../kings-cup/ring';
import { HandSpread } from '../palace/Palace';
import { call, draw, JACK, lowestClaim, MAX_PLAYERS, MIN_PLAYERS, newGame, options, play, QUAD_SIPS, same, type Entry, type Game } from './logic';

interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Shared {
  g: Game | null;
  seats: Seat[];
  /** Where the circle's cards lie (the same on every phone). */
  slots: Slot[];
}

const VALUES = [7, 8, 9, 10, 11, 12, 13, 14];
/** How long a turned-over card stays up big. */
const REVEAL_MS = 2600;

/** Arschloch: lie about your cards; every player on their own phone. */
export default function Arschloch() {
  const { state, set, room, isHost, myId } = useShared<Shared>('ar', { g: null, seats: [], slots: [] });
  const known = useApp().knows('arschloch');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[] | null>(null);

  /* ---------- Lobby ---------- */
  if (!state.g || state.seats.length < MIN_PLAYERS) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <div className="connecting-emoji">💩</div>
            <h2 className="bd-title">{t('Asshole')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to lay out the circle…', { name: host.name }) : t('Waiting for the host to start…')}</p>
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
          <span className="kicker">{t('2 to 8 players, 32 cards')}</span>
          <h2 className="bd-title big">{t('Asshole')}</h2>
          {!known && <p className="lead">{t('Each player on their own phone. Lie about your cards, catch the liars, and don’t end up with all four Jacks.')}</p>}
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
        {!known && <p className="fine-print">{t('The order of the room is the order at the table. Everyone else in the room watches.')}</p>}
        <div className="sticky-action">
          <BigButton
            size="xl"
            disabled={seats.length < MIN_PLAYERS}
            onClick={() => set({ g: newGame(seats.length, Math.floor(Math.random() * seats.length)), seats, slots: layRing(32) })}
          >
            {seats.length < MIN_PLAYERS ? t('At least 2 players') : t('Lay out the circle')}
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
      slots={state.slots}
      photoOf={photoOf}
      me={me}
      known={known}
      isHost={isHost}
      connected={isHost || room.status === 'open'}
      act={(next) => set((s) => (s.g ? { ...s, g: next(s.g) } : s))}
      onNewGame={() => set((s) => ({ ...s, g: null }))}
    />
  );
}

const rank = (v: number) => rankLabel(v);

function entryText(e: Entry, seats: Seat[]) {
  const name = (i: number) => seats[i]?.name ?? t('Someone');
  switch (e.k) {
    case 'draw':
      return t('{name} draws a card from the circle.', { name: name(e.by) });
    case 'play':
      return t('{name} lays down: “{rank}”.', { name: name(e.by), rank: rank(e.claim) });
    case 'call':
      return e.lied
        ? t('{name} turns it over: a {card}, not a {claim}! {liar} takes {n} and drinks {n}.', { name: name(e.by), card: rank(e.card.value), claim: rank(e.claim), liar: name(e.taker), n: e.cards })
        : t('{name} turns it over: it really is a {card}. {name} takes {n} and drinks {n}.', { name: name(e.by), card: rank(e.card.value), n: e.cards });
    case 'quad':
      return t('{name} lays down four {rank}s and hands out {n}.', { name: name(e.by), rank: rank(e.value), n: QUAD_SIPS });
    case 'lose':
      return t('{name} has all four Jacks!', { name: name(e.by) });
  }
}

function Table({
  g,
  seats,
  slots,
  photoOf,
  me,
  known,
  isHost,
  connected,
  act,
  onNewGame,
}: {
  g: Game;
  seats: Seat[];
  slots: Slot[];
  photoOf: (id: string) => string | undefined;
  me: number;
  known: boolean;
  isHost: boolean;
  connected: boolean;
  act: (next: (g: Game) => Game) => void;
  onNewGame: () => void;
}) {
  const hand = me >= 0 ? g.hands[me] : [];
  const o = me >= 0 ? options(g, me) : { call: false, draw: false, play: false, mustCall: false };
  const myTurn = me >= 0 && g.phase === 'play' && g.turn === me;
  const low = lowestClaim(g);
  const top = g.pile.at(-1);
  const last = g.log.at(-1);
  const [sel, setSel] = useState<Card | null>(null);
  const [claim, setClaim] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ id: string; e: Extract<Entry, { k: 'call' }> } | null>(null);
  const [sip, setSip] = useState<{ id: number; text: string } | null>(null);

  // A new state clears the selection.
  const key = JSON.stringify([hand, g.turn, g.log.length, g.pile.length]);
  useEffect(() => {
    setSel(null);
    setClaim(null);
  }, [key]);

  // What just happened, on every phone: a card turned over (big, for a moment) and your own sips.
  const seen = useRef<number | null>(null);
  useEffect(() => {
    // The first state this phone sees (opening the game, a reload): nothing to show yet.
    if (seen.current === null || g.seq < seen.current) {
      seen.current = g.seq;
      return;
    }
    const fresh = g.log.filter((e) => e.n > seen.current!);
    seen.current = g.seq;
    if (!fresh.length) return;
    const turned = fresh.find((e): e is Extract<Entry, { k: 'call' }> => e.k === 'call');
    if (turned) {
      setReveal({ id: String(turned.n), e: turned });
      sfx.pop();
    }
    if (me < 0) return;
    let text = '';
    for (const e of fresh) {
      if (e.k === 'lose' && e.by === me) {
        text = t('Empty your glass!');
        recordLoss('arschloch');
      } else if (e.k === 'lose') celebrate();
      if (e.k === 'call' && e.taker === me) {
        text ||= t('Drink {n}!', { n: e.cards });
        recordSips(e.cards, 0);
      }
      if (e.k === 'quad' && e.by === me) {
        text ||= t('Hand out {n}!', { n: QUAD_SIPS });
        recordSips(0, QUAD_SIPS);
      }
    }
    if (text) {
      setSip({ id: Date.now(), text });
      buzz([40, 30, 40]);
    }
  }, [g.seq, g.log, me]);
  useEffect(() => {
    if (!sip) return;
    const timer = window.setTimeout(() => setSip(null), 1800);
    return () => window.clearTimeout(timer);
  }, [sip]);
  useEffect(() => {
    if (!reveal) return;
    const timer = window.setTimeout(() => setReveal(null), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [reveal]);
  useEffect(() => {
    if (myTurn) buzz([60, 40, 60]);
  }, [myTurn]);

  if (g.phase === 'over')
    return (
      <>
        <Over g={g} seats={seats} photoOf={photoOf} me={me} isHost={isHost} onNewGame={onNewGame} />
        {/* The card that brought the last Jack, turned over big on top of the end. */}
        {reveal && <Reveal key={reveal.id} e={reveal.e} seats={seats} />}
        {sip && (
          <span key={sip.id} className="as-sip" aria-live="polite">
            {sip.text}
          </span>
        )}
      </>
    );

  const chosenClaim = claim ?? (sel && sel.value >= low ? sel.value : null);
  let headline: string;
  if (!myTurn) headline = t('{name}’s turn', { name: seats[g.turn]?.name ?? '' });
  else if (o.mustCall) headline = t('Nothing to play: turn it over!');
  else if (o.draw) headline = o.call ? t('Believe it and draw, or turn it over') : t('Draw a card from the circle');
  else if (o.call) headline = t('Believe it and play, or turn it over');
  else headline = t('Lay a card down and say what it is');

  return (
    <div className="as ar fill">
      <div className={`pl-status${myTurn ? ' mine' : ''}`}>
        <span className="pl-status-text">{headline}</span>
        {last && <span className="pl-status-sub">{entryText(last, seats)}</span>}
        {myTurn && o.play && !known && <span className="pl-status-sub">{t('Say {rank} or higher. You may lie.', { rank: rank(low) })}</span>}
      </div>

      <div className="as-seats">
        {seats.map((s, i) => (
          <span key={s.id} className={`as-seat${g.turn === i ? ' turn' : ''}`} style={{ '--chip': s.color } as CSSProperties}>
            <span className="as-seat-avatar">
              <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
            </span>
            <span className="as-seat-name">{i === me ? t('You') : s.name}</span>
            <span className="as-seat-sub">🂠 {g.hands[i].length}</span>
          </span>
        ))}
      </div>

      <div className="ar-table">
        <div className="ar-ring">
          <div className="kc-slots">
            {slots.map((slot, i) =>
              g.ring[i] ? (
                <button
                  key={i}
                  type="button"
                  className={`kc-slot${o.draw ? ' ar-pickable' : ''}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%`, '--rot': `${slot.rot}deg` } as CSSProperties}
                  disabled={!o.draw || !connected}
                  aria-label={t('Face-down card')}
                  onClick={() => {
                    sfx.pop();
                    buzz(12);
                    act((x) => draw(x, me, i));
                  }}
                />
              ) : null,
            )}
          </div>
          <div className="ar-pile">
            {g.pile.length > 0 ? (
              <>
                <span className="ar-pile-stack" style={{ '--n': Math.min(5, g.pile.length) } as CSSProperties} key={g.pile.length}>
                  {Array.from({ length: Math.min(5, g.pile.length) }, (_, i) => (
                    <span key={i} className="ar-pile-card" style={{ '--i': i } as CSSProperties} />
                  ))}
                </span>
                <span className="ar-claim">
                  <strong>{rank(top!.claim)}</strong>
                  <small>{seats[top!.by]?.name}</small>
                </span>
                <span className="ar-pile-count">{t('{n} in the pile', { n: g.pile.length })}</span>
              </>
            ) : (
              <span className="ar-pile-empty">{t('Pile')}</span>
            )}
          </div>
          {g.burned.length > 0 && (
            <span className="ar-burned">
              {t('Out: {ranks}', { ranks: g.burned.map((b) => `4×${rank(b.value)}`).join(' ') })}
            </span>
          )}
          {reveal && <Reveal key={reveal.id} e={reveal.e} seats={seats} />}
        </div>
      </div>

      {me >= 0 && hand.length > 0 && (
        <HandSpread cards={hand} isSelected={(c) => !!sel && same(sel, c)} onTap={o.play ? (c) => setSel(sel && same(sel, c) ? null : c) : undefined} />
      )}
      {me >= 0 && hand.length === 0 && (
        <p className="ar-hint">{myTurn && o.draw ? t('Tap a card in the circle. Only you get to see it.') : t('No cards in your hand: next turn you draw from the circle.')}</p>
      )}

      <div className="pl-actions">
        {myTurn && !connected ? (
          <BigButton variant="glass" disabled>
            {t('Reconnecting…')}
          </BigButton>
        ) : myTurn ? (
          <>
            {o.play && sel && (
              <div className="ar-claims" role="radiogroup" aria-label={t('Say what it is')}>
                {VALUES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={chosenClaim === v}
                    className={`ar-claim-btn${chosenClaim === v ? ' active' : ''}${v === sel.value ? ' true' : ''}`}
                    disabled={v < low}
                    onClick={() => {
                      setClaim(v);
                      buzz(8);
                    }}
                  >
                    {rank(v)}
                  </button>
                ))}
              </div>
            )}
            <div className="pl-action-row">
              {o.play && (
                <BigButton disabled={!sel || chosenClaim == null} onClick={() => sel && chosenClaim != null && act((x) => play(x, me, sel, chosenClaim))}>
                  {!sel ? t('Pick a card') : chosenClaim == null ? t('Say what it is') : t('Lay down as {rank}', { rank: rank(chosenClaim) })}
                </BigButton>
              )}
              {o.call && (
                <BigButton variant="danger" className={o.play ? 'as-pass' : ''} onClick={() => act((x) => call(x, me))}>
                  {t('Liar! 🔍')}
                </BigButton>
              )}
            </div>
          </>
        ) : null}
      </div>
      {sip && (
        <span key={sip.id} className="as-sip" aria-live="polite">
          {sip.text}
        </span>
      )}
    </div>
  );
}

/** The turned-over card, big on everyone's phone: what was said, what it was, who takes the pile. */
function Reveal({ e, seats }: { e: Extract<Entry, { k: 'call' }>; seats: Seat[] }) {
  return (
    <div className={`ar-reveal${e.lied ? ' lied' : ' true'}`} role="status">
      <span className="ar-reveal-card">
        <span className="ar-reveal-inner">
          <span className="pcard-face pcard-back" />
          <CardFace card={e.card} />
        </span>
      </span>
      <span className="ar-reveal-stamp">{e.lied ? t('Lie!') : t('True!')}</span>
      <span className="ar-reveal-text">
        {t('Said {claim}', { claim: rank(e.claim) })} · {t('{name} takes {n}', { name: seats[e.taker]?.name ?? '', n: e.cards })}
      </span>
    </div>
  );
}

function Over({
  g,
  seats,
  photoOf,
  me,
  isHost,
  onNewGame,
}: {
  g: Game;
  seats: Seat[];
  photoOf: (id: string) => string | undefined;
  me: number;
  isHost: boolean;
  onNewGame: () => void;
}) {
  const loser = seats[g.loser ?? 0];
  const jacks = g.hands[g.loser ?? 0].filter((c) => c.value === JACK);
  const reveal = [...g.log].reverse().find((e): e is Extract<Entry, { k: 'call' }> => e.k === 'call');
  return (
    <div className="bd ar-over">
      <div className="bd-head center">
        <span className="kicker">{t('Game over')}</span>
        <span className="ar-over-avatar" style={{ '--chip': loser?.color } as CSSProperties}>
          <Avatar avatar={loser?.avatar ?? '💩'} photo={loser ? photoOf(loser.id) : undefined} />
          <span className="ar-over-poo">💩</span>
        </span>
        <h2 className="bd-title big">{g.loser === me ? t('You’re the Asshole!') : t('{name} is the Asshole!', { name: loser?.name ?? '' })}</h2>
        <p className="lead">{t('All four Jacks. Empty your glass!')}</p>
        {reveal && <p className="fine-print">{reveal.lied ? t('Caught lying, and the pile held the last Jack.') : t('Turned over the truth, and the pile held the last Jack.')}</p>}
      </div>
      <div className="ar-jacks">
        {jacks.map((c) => (
          <span key={`${c.value}${c.suit}`} className="ar-jack">
            <CardFace card={c} />
          </span>
        ))}
      </div>
      <div className="sticky-action">
        {isHost ? (
          <BigButton size="xl" onClick={onNewGame}>
            {t('Play again')}
          </BigButton>
        ) : (
          <p className="fine-print">{t('The host starts the next game.')}</p>
        )}
      </div>
    </div>
  );
}

