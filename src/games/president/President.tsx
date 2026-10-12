import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { cardName, rankLabel, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { recordRank, recordSips } from '../../lib/stats';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import { HandSpread } from '../palace/Palace';
import { canPlay, giveBack, MAX_PLAYERS, MIN_PLAYERS, newGame, nextRound, pass, play, ranksFrom, ROUND_SIPS, same, toBeat, type Entry, type Game, type Rank } from './logic';
import Finished from '../../components/Finished';

export interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Shared {
  g: Game | null;
  /** Who plays, in seat order (clockwise). */
  seats: Seat[];
}

/** English; render with t(). */
export const RANK_NAME: Record<Rank, string> = {
  president: tx('President'),
  vice: tx('Vice President'),
  citizen: tx('Citizen'),
  'vice-arschloch': tx('Vice Asshole'),
  arschloch: tx('Asshole'),
};
export const RANK_EMOJI: Record<Rank, string> = {
  president: '👔',
  vice: '🎩',
  citizen: '🙂',
  'vice-arschloch': '🥴',
  arschloch: '💩',
};

const group = (cards: Card[]) => (cards.length > 1 ? `${cards.length}× ${rankLabel(cards[0].value)}` : cardName(cards[0]));

/** President: every player on their own phone. */
export default function President() {
  const { state, set, room, isHost, myId } = useShared<Shared>('pres', { g: null, seats: [] });
  const known = useApp().knows('president');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[] | null>(null);

  /* ---------- Lobby ---------- */
  if (!state.g || state.seats.length < MIN_PLAYERS) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <div className="connecting-emoji">👔</div>
            <h2 className="bd-title">{t('President')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to deal…', { name: host.name }) : t('Waiting for the host to deal…')}</p>
          </div>
        </div>
      );
    }
    const chosen = (picked ?? online.slice(0, MAX_PLAYERS).map((m) => m.id)).filter((id) => online.some((m) => m.id === id));
    const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-MAX_PLAYERS));
    const seats: Seat[] = online
      .filter((m) => chosen.includes(m.id))
      .map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }));
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('3 to 6 players, 32 cards')}</span>
          <h2 className="bd-title big">{t('President')}</h2>
          {!known && <p className="lead">{t('Each player on their own phone. Get rid of your cards first: the last one is the Asshole.')}</p>}
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
        {!known && <p className="fine-print">{t('Everyone else in the room watches.')}</p>}
        <div className="sticky-action">
          <BigButton size="xl" disabled={seats.length < MIN_PLAYERS} onClick={() => set({ g: newGame(seats.length), seats })}>
            {seats.length < MIN_PLAYERS ? t('At least 3 players') : t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  const me = state.seats.findIndex((s) => s.id === myId);
  // Photos come from the room (sent once when a phone joins), not with every move.
  const photoOf = (id: string) => room.members.find((m) => m.id === id)?.photo;
  return (
    <Table
      g={state.g}
      seats={state.seats}
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

function entryText(e: Entry, seats: Seat[]) {
  const name = (i: number) => seats[i]?.name ?? t('Someone');
  if (e.k === 'pass') return t('{name} passes and drinks 1.', { name: name(e.by) });
  if (e.k === 'close') return t('Nobody beats {name}: they hand out 1 sip and lead.', { name: name(e.by) });
  if (e.k === 'give') return t('{from} gives {to} {n} cards.', { from: name(e.from), to: name(e.to), n: e.n });
  const text = t('{name} plays {cards}.', { name: name(e.by), cards: group(e.cards) });
  return e.out ? `${text} ${t('Out of cards!')}` : text;
}

/** Who passed since the last play in this trick (they're shown as passed). */
function passedSince(g: Game) {
  const passed = new Set<number>();
  for (let i = g.log.length - 1; i >= 0; i--) {
    const e = g.log[i];
    if (e.k !== 'pass') break;
    passed.add(e.by);
  }
  return g.trick.length ? passed : new Set<number>();
}

function Table({
  g,
  seats,
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
  photoOf: (id: string) => string | undefined;
  me: number;
  known: boolean;
  isHost: boolean;
  connected: boolean;
  act: (next: (g: Game) => Game) => void;
  onNewGame: () => void;
}) {
  const [sel, setSel] = useState<Card[]>([]);
  const [sip, setSip] = useState<{ id: number; text: string } | null>(null);
  const hand = me >= 0 ? g.hands[me] : [];
  const top = toBeat(g);
  const myTurn = me >= 0 && g.phase === 'play' && g.turn === me;
  const owe = me >= 0 && g.phase === 'exchange' ? g.owed.find((o) => o.from === me) : undefined;
  const passed = passedSince(g);
  const last = g.log.at(-1);
  const ranks = g.phase === 'done' ? ranksFrom(g.out) : g.ranks;

  // A new state (someone moved) clears the selection.
  const key = JSON.stringify([g.hands[me] ?? [], g.turn, g.phase, g.log.length, g.round]);
  useEffect(() => setSel([]), [key]);

  // Your own sips, as they happen: passing, closing a trick, the end of a round.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const id = `${g.round}:${g.log.length}:${JSON.stringify(last)}:${g.phase}`;
    if (seen.current === null || seen.current === id) {
      seen.current = id;
      return;
    }
    seen.current = id;
    let text = '';
    if (g.phase === 'done' && me >= 0) {
      const r = ranksFrom(g.out)[me];
      const s = ROUND_SIPS[r];
      text = s.drink ? t('Drink {n}!', { n: s.drink }) : s.give ? t('Hand out {n}!', { n: s.give }) : '';
      if (r === 'president') celebrate();
      recordRank(r);
      recordSips(s.drink, s.give);
    } else if (last?.k === 'pass' && last.by === me) {
      text = t('Drink 1!');
      recordSips(1, 0);
    } else if (last?.k === 'close' && last.by === me) {
      text = t('Hand out 1!');
      recordSips(0, 1);
    }
    if (text) {
      setSip({ id: Date.now(), text });
      buzz([40, 30, 40]);
    }
    if (last?.k === 'play') sfx.pop();
  }, [g.round, g.log.length, g.phase, last, me, g.out]);
  useEffect(() => {
    if (!sip) return;
    const timer = window.setTimeout(() => setSip(null), 1600);
    return () => window.clearTimeout(timer);
  }, [sip]);

  // It's your turn: a buzz.
  useEffect(() => {
    if (myTurn) buzz([60, 40, 60]);
  }, [myTurn]);

  const count = (v: number) => hand.filter((c) => c.value === v).length;
  const beats = (c: Card) => !top || (c.value > top.cards[0].value && count(c.value) >= top.cards.length);

  const tap = (c: Card) => {
    if (owe) {
      setSel((x) => (x.some((y) => same(y, c)) ? x.filter((y) => !same(y, c)) : [...x, c].slice(-owe.n)));
      sfx.pop();
      return;
    }
    if (!myTurn) return;
    if (!beats(c)) {
      buzz([30, 30, 30]);
      return;
    }
    sfx.pop();
    buzz(10);
    setSel((x) => {
      // On a trick: as many as it takes, all at once.
      if (top) return x.length && x[0].value === c.value ? [] : hand.filter((y) => y.value === c.value).slice(0, top.cards.length);
      if (x.some((y) => same(y, c))) return x.filter((y) => !same(y, c));
      return x.length && x[0].value === c.value ? [...x, c] : [c];
    });
  };
  const selOk = myTurn && canPlay(g, me, sel);

  let headline: string;
  if (g.phase === 'done') headline = t('Round over');
  else if (g.phase === 'exchange') {
    const waiting = g.owed.map((o) => seats[o.from]?.name).filter(Boolean);
    headline = owe ? t('Give {n} back to {name}', { n: owe.n, name: seats[owe.to].name }) : t('Waiting for {names}…', { names: waiting.join(', ') });
  } else if (myTurn) headline = top ? t('Beat it, or pass') : t('Your lead!');
  else headline = t('{name}’s turn', { name: seats[g.turn]?.name ?? '' });

  return (
    <div className="as fill">
      {/* Rounds go on and on: the game counts once its first round is over. */}
      {(g.round > 1 || g.phase === 'done') && <Finished game="president" />}
      <div className={`pl-status${myTurn || owe ? ' mine' : ''}`}>
        <span className="pl-status-text">{headline}</span>
        {last && g.phase !== 'done' && <span className="pl-status-sub">{entryText(last, seats)}</span>}
        {g.phase === 'play' && !known && myTurn && (
          <span className="pl-status-sub">
            {top ? t('Play {n}× one value higher than {rank}. Passing costs a sip.', { n: top.cards.length, rank: rankLabel(top.cards[0].value) }) : t('Lead one card or several of one value.')}
          </span>
        )}
      </div>

      <div className="as-seats">
        {seats.map((s, i) => {
          const r = ranks[i];
          const place = g.out.indexOf(i);
          return (
            <span
              key={s.id}
              className={`as-seat${g.phase === 'play' && g.turn === i ? ' turn' : ''}${passed.has(i) ? ' passed' : ''}${place >= 0 && g.phase !== 'done' ? ' out' : ''}`}
              style={{ '--chip': s.color } as CSSProperties}
            >
              <span className="as-seat-avatar">
                <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
                {r && <span className="as-seat-rank">{RANK_EMOJI[r]}</span>}
              </span>
              <span className="as-seat-name">{i === me ? t('You') : s.name}</span>
              <span className="as-seat-sub">{place >= 0 && g.phase !== 'done' ? `#${place + 1}` : passed.has(i) ? t('passed') : `🂠 ${g.hands[i].length}`}</span>
            </span>
          );
        })}
      </div>

      {g.phase === 'done' ? (
        <RoundOver g={g} seats={seats} me={me} isHost={isHost} onNext={() => act(nextRound)} onNewGame={onNewGame} />
      ) : (
        <>
          <div className="as-table">
            {top ? (
              <div className="as-trick" key={`${g.round}:${g.log.length}`}>
                <span className="as-trick-cards" style={{ '--n': top.cards.length } as CSSProperties}>
                  {top.cards.map((c, i) => (
                    <span key={`${c.value}${c.suit}`} className="as-trick-card" style={{ '--i': i } as CSSProperties}>
                      <CardFace card={c} />
                    </span>
                  ))}
                </span>
                <span className="as-trick-by">{seats[top.by]?.name}</span>
              </div>
            ) : (
              <span className="as-empty">{g.phase === 'exchange' ? t('Swapping cards') : t('{name} leads', { name: me === g.turn ? t('You') : seats[g.turn]?.name })}</span>
            )}
          </div>

          {me >= 0 && g.got[me]?.length > 0 && g.phase === 'exchange' && (
            <p className="as-got">
              {t('You got: {cards}', { cards: g.got[me].map(cardName).join(' ') })}
            </p>
          )}

          {me >= 0 && (
            <HandSpread
              cards={hand}
              isSelected={(c) => sel.some((y) => same(y, c))}
              isDim={myTurn ? (c) => !beats(c) : undefined}
              onTap={myTurn || owe ? tap : undefined}
              empty={g.out.includes(me) ? t('Out of cards! Watch the others fight it out.') : undefined}
            />
          )}

          <div className="pl-actions">
            {(myTurn || owe) && !connected ? (
              <BigButton variant="glass" disabled>
                {t('Reconnecting…')}
              </BigButton>
            ) : owe ? (
              <BigButton disabled={sel.length !== owe.n} onClick={() => act((x) => giveBack(x, me, sel))}>
                {sel.length === owe.n ? t('Give {cards}', { cards: sel.map(cardName).join(' ') }) : t('Pick {n} cards', { n: owe.n })}
              </BigButton>
            ) : myTurn ? (
              <div className="pl-action-row">
                <BigButton disabled={!selOk} onClick={() => act((x) => play(x, me, sel))}>
                  {selOk ? t('Play {cards}', { cards: group(sel) }) : t('Pick cards')}
                </BigButton>
                {top && (
                  <BigButton variant="danger" className="as-pass" onClick={() => act((x) => pass(x, me))}>
                    {t('Pass 🍺')}
                  </BigButton>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
      {sip && (
        <span key={sip.id} className="as-sip" aria-live="polite">
          {sip.text}
        </span>
      )}
    </div>
  );
}

function RoundOver({ g, seats, me, isHost, onNext, onNewGame }: { g: Game; seats: Seat[]; me: number; isHost: boolean; onNext: () => void; onNewGame: () => void }) {
  const ranks = ranksFrom(g.out);
  return (
    <div className="as-over">
      <ol className="as-ranks">
        {g.out.map((seat) => {
          const r = ranks[seat];
          const s = ROUND_SIPS[r];
          return (
            <li key={seat} className={`as-rank as-rank-${r}${seat === me ? ' me' : ''}`}>
              <span className="as-rank-emoji">{RANK_EMOJI[r]}</span>
              <span className="as-rank-text">
                <strong>{seats[seat]?.name}</strong>
                <small>{t(RANK_NAME[r])}</small>
              </span>
              <span className="as-rank-sips">{s.drink ? t('drinks {n}', { n: s.drink }) : s.give ? t('hands out {n}', { n: s.give }) : ''}</span>
            </li>
          );
        })}
      </ol>
      <div className="sticky-action stack">
        {isHost ? (
          <>
            <BigButton size="xl" onClick={onNext}>
              {t('Next round')}
            </BigButton>
            <BigButton variant="glass" onClick={onNewGame}>
              {t('New players')}
            </BigButton>
          </>
        ) : (
          <p className="fine-print">{t('The host deals the next round.')}</p>
        )}
      </div>
    </div>
  );
}
