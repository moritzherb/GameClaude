import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import DeckCount from '../../components/DeckCount';
import NextName from '../../components/NextName';
import PlayingCard from '../../components/PlayingCard';
import Suit from '../../components/Suit';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { cardColor, cardName, rankLabel, SUITS, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { navigate, paths } from '../../lib/router';
import { load, save } from '../../lib/storage';
import { useRoom } from '../../net/RoomProvider';
import { useChanged, useQueuedSend, useResync } from '../../net/sync';
import { savedFor } from '../../net/saved';
import { useApp } from '../../state/AppState';
import { direction, guess, MISSES_TO_PASS, newGame, next, nextGuesser, possible, takeOver, VALUES, type Game } from './logic';

/*
 * Played with two phones in a room: the host's phone lies in the middle as the table and
 * shows the piles, big. The second phone is the deck: it goes round to whoever deals, who
 * peeks at the card on it, types in the guesses and moves the game on.
 */

/** The flipped card stays on show this long before it flies onto its pile. */
const LAND_MS = 1100;
const STORE_KEY = 'ftd:session';

interface Seat {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Session {
  seats: Seat[];
  game: Game;
}

/** `at`: the state the move was made on (see stamp), so a double tap or a tap made on an old state is dropped. */
type Act = ({ t: 'guess'; value: number } | { t: 'next' } | { t: 'take' }) & { at?: string };

/** Where the game stands: a move made on another state than this one is stale. */
const stamp = (g: Game) => [g.deck.length, g.firstGuess ?? '-', g.result ? 'r' : '-', g.handover ? 'h' : '-', g.dealer, g.guesser].join('|');
type Msg = { g: 'ftd'; type: 'state'; session: Session | null } | { g: 'ftd'; type: 'act'; act: Act } | { g: 'ftd'; type: 'sync' };
const isMsg = (d: unknown): d is Msg => typeof d === 'object' && d !== null && (d as Msg).g === 'ftd';

function apply(s: Session, act: Act): Session {
  if (act.at && act.at !== stamp(s.game)) return s;
  const g = act.t === 'guess' ? guess(s.game, act.value) : act.t === 'next' ? next(s.game, s.seats.length) : takeOver(s.game);
  return g === s.game ? s : { ...s, game: g };
}

/** Host: owns the session and sends it to the deck phone. Deck phone: shows it and sends its moves. */
function useFtd() {
  const room = useRoom();
  const isHost = room.role === 'host';
  const myId = room.myId ?? '';
  const { onGame, sendTo, sendToHost, members, code } = room;
  const [hostSession, setHostSession] = useState<Session | null>(() => savedFor<Session>(STORE_KEY, 'session', isHost, code));
  const [guestSession, setGuestSession] = useState<Session | null>(null);
  // Already read above when the room code is known; otherwise once it is.
  const restored = useRef(isHost && !!code);

  useEffect(() => {
    if (!isHost || !code || restored.current) return;
    restored.current = true;
    const saved = load<{ code: string; session: Session } | null>(STORE_KEY, null);
    if (saved?.code === code) setHostSession(saved.session);
  }, [isHost, code]);

  useEffect(() => {
    if (isHost && code && restored.current) save(STORE_KEY, hostSession ? { code, session: hostSession } : null);
  }, [isHost, code, hostSession]);

  // A move made while the connection is down goes out once it's back.
  const queued = useQueuedSend(sendToHost);
  const act = useCallback(
    (a: Act) => {
      if (isHost) setHostSession((s) => (s ? apply(s, a) : s));
      else queued({ g: 'ftd', type: 'act', act: a } satisfies Msg);
    },
    [isHost, queued],
  );

  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (!isMsg(data) || !fromId) return;
      if (data.type === 'act') setHostSession((s) => (s ? apply(s, data.act) : s));
    });
  }, [isHost, onGame]);

  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (isMsg(data) && data.type === 'sync' && fromId) sendTo(fromId, { g: 'ftd', type: 'state', session: hostSession } satisfies Msg);
    });
  }, [isHost, onGame, sendTo, hostSession]);

  useEffect(() => {
    if (!isHost) return;
    for (const m of members) if (m.id !== myId && m.online) sendTo(m.id, { g: 'ftd', type: 'state', session: hostSession } satisfies Msg);
  }, [isHost, hostSession, members, myId, sendTo]);

  // Deck phone: take the state, and ask again whenever an update could have been missed.
  const take = useChanged(setGuestSession);
  useEffect(() => {
    if (isHost) return;
    return onGame((data) => {
      if (isMsg(data) && data.type === 'state') take(data.session);
    });
  }, [isHost, onGame, take]);
  const ask = useCallback(() => sendToHost({ g: 'ftd', type: 'sync' } satisfies Msg), [sendToHost]);
  useResync(!isHost, ask);

  return { room, isHost, myId, session: isHost ? hostSession : guestSession, act, setHostSession };
}

export default function FuckTheDealer() {
  const { room, isHost, session, act, setHostSession } = useFtd();
  if (!session) return isHost ? <Lobby room={room} onStart={setHostSession} /> : <WaitForTable host={room.members.find((m) => m.host)?.name} />;
  return isHost ? <TableView session={session} onAgain={() => setHostSession(null)} /> : <DeckView session={session} act={act} />;
}

/* ---------------- Host: pick the first dealer ---------------- */

function Lobby({ room, onStart }: { room: ReturnType<typeof useRoom>; onStart: (s: Session) => void }) {
  const { players } = useApp();
  const known = useApp().knows('fuck-the-dealer');
  const [dealerId, setDealerId] = useState(() => (players.length ? pick(players).id : ''));
  const decks = room.members.filter((m) => !m.host && m.online);
  const enough = players.length >= 2;
  return (
    <div className="bd">
      <div className="bd-head">
        <span className="kicker">{t('Two phones')}</span>
        <h2 className="bd-title">{t('Who’s the dealer?')}</h2>
        {!known && (
          <p className="lead">{t('This phone lies in the middle as the table. The second phone is the deck: it always goes to the dealer, who peeks at the card on it.')}</p>
        )}
      </div>

      <div className={`ftd-deck-status${decks.length ? ' on' : ''}`}>
        <span className="ftd-deck-status-icon">{decks.length ? '🃏' : '📱'}</span>
        <span>{decks.length ? t('Deck phone: {name}', { name: decks[0].name }) : t('Connect a second phone to this room. It becomes the deck.')}</span>
      </div>

      {enough ? (
        <>
          <div className="pick-grid">
            {players.map((p) => (
              <Tap
                key={p.id}
                className={`pick-chip${p.id === dealerId ? ' selected' : ''}`}
                style={{ '--chip': p.color } as CSSProperties}
                onClick={() => setDealerId(p.id)}
              >
                <span className="pick-chip-avatar">{p.avatar}</span>
                <span className="pick-chip-name">{p.name}</span>
                {/* The same word in German for this game. */}
                {p.id === dealerId && <span className="pick-chip-badge">Dealer</span>}
              </Tap>
            ))}
          </div>
          <button type="button" className="text-btn" onClick={() => setDealerId(pick(players).id)}>
            {t('Random dealer')}
          </button>
        </>
      ) : (
        <div className="notice-block">
          <p className="notice">{t('Add at least 2 players on this phone first.')}</p>
          <BigButton variant="light" onClick={() => navigate(paths.players(paths.online('fuck-the-dealer')))}>
            {t('Add players')}
          </BigButton>
        </div>
      )}

      <div className="sticky-action">
        <BigButton
          size="xl"
          disabled={!enough || !decks.length}
          onClick={() =>
            onStart({
              seats: players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color })),
              game: newGame(players.length, Math.max(0, players.findIndex((p) => p.id === dealerId))),
            })
          }
        >
          {!decks.length ? t('Waiting for the deck phone…') : t('Let’s go')}
        </BigButton>
      </div>
    </div>
  );
}

function WaitForTable({ host }: { host?: string }) {
  return (
    <div className="bd">
      <div className="connecting">
        <div className="connecting-emoji">🃏</div>
        <h2 className="bd-title">{t('You’re the deck')}</h2>
        <p className="lead">{host ? t('Waiting for {name} to start the game…', { name: host }) : t('Waiting for the table…')}</p>
      </div>
    </div>
  );
}

/* ---------------- Host: the table in the middle ---------------- */

function Handover({ session, children }: { session: Session; children?: React.ReactNode }) {
  const g = session.game;
  const from = session.seats[g.handover!.dealer];
  const sips = g.handover!.sips;
  return (
    <div className="bd ftd-handover">
      <div className="bd-head center">
        <span className="kicker">{g.over ? t('Deck’s empty!') : t('Dealer change')}</span>
        <span className="bd-avatar xl" style={{ background: from.color }}>
          {from.avatar}
        </span>
        <h2 className="bd-title big">{sips ? t('{name} drinks up', { name: from.name }) : t('{name} gets away', { name: from.name })}</h2>
        <div className={`ftd-sips${sips ? '' : ' none'}`}>
          <span className="ftd-sips-num">{sips}</span>
          <span className="ftd-sips-label">{sips === 1 ? t('sip') : t('sips')}</span>
        </div>
        <p className="lead">{sips ? t('All the sips from this round as dealer, at once.') : t('Not a single sip this round. Lucky.')}</p>
      </div>
      {children}
    </div>
  );
}

function TableView({ session, onAgain }: { session: Session; onAgain: () => void }) {
  const known = useApp().knows('fuck-the-dealer');
  const g = session.game;
  const seats = session.seats;
  // The resolved card stays face up next to the table until it lands on its pile.
  const [landed, setLanded] = useState(true);
  const [flight, setFlight] = useState<{ value: number; from: DOMRect; key: number } | null>(null);
  const slot = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const r = g.result;
  const out = 52 - g.deck.length;
  // A new result came in from the deck phone: show it, then fly it onto its pile.
  const resultKey = r ? `${out}-${r.card.value}${r.card.suit}` : null;
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!r) return setLanded(true);
    setLanded(false);
    timer.current = window.setTimeout(() => {
      if (r.outcome === 'first') celebrate();
      else if (r.outcome === 'second') {
        sfx.pop();
        buzz([30, 40, 30]);
      } else sfx.boo();
      timer.current = window.setTimeout(() => {
        const from = slot.current?.getBoundingClientRect();
        if (from) setFlight({ value: r.card.value, from, key: out });
        setLanded(true);
      }, LAND_MS - 450);
    }, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey]);

  if (g.handover) {
    const dealer = seats[g.dealer];
    return (
      <Handover session={session}>
        {g.over ? (
          <>
            <Tally session={session} />
            <div className="sticky-action">
              <BigButton onClick={onAgain}>{t('Play again')}</BigButton>
            </div>
          </>
        ) : (
          <div className="ftd-next-dealer">
            <span className="kicker">{t('New dealer')}</span>
            <span className="bd-player">
              <span className="bd-avatar sm" style={{ background: dealer.color }}>
                {dealer.avatar}
              </span>
              <span className="bd-player-name">{dealer.name}</span>
            </span>
            <p className="lead center">{t('Pass the deck phone to {name}.', { name: dealer.name })}</p>
          </div>
        )}
      </Handover>
    );
  }

  const dealer = seats[g.dealer];
  const guesser = seats[g.guesser];
  const dir = g.firstGuess != null && g.deck.length ? direction(g.firstGuess, g.deck[0].value) : null;
  const shown: Card | undefined = r && !landed ? r.card : g.deck[0];

  return (
    <div className="ftd ftd-tablephone fill">
      <div className="kc-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: dealer.color }}>
            {dealer.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{dealer.name}</span>
            <span className="bd-player-sub">{g.saved === 1 ? t('Dealer · 1 sip so far') : t('Dealer · {n} sips so far', { n: g.saved })}</span>
          </span>
        </div>
        <DeckCount left={g.deck.length + (r && !landed ? 1 : 0)} />
      </div>

      <Table g={g} hide={r && !landed ? r.card : null} flight={flight} />

      <div className="ftd-turn">
        <div ref={slot} className={`ftd-deck${g.deck.length > 1 || (r && !landed) ? ' stacked' : ''}`}>
          {shown ? <PlayingCard key={r && !landed ? out - 1 : out} card={shown} faceUp={!!r && !landed} size="lg" /> : <span className="ftd-deck-empty" />}
        </div>
        {/* The result takes the question's place, so the table never has to scroll. */}
        {r ? (
          <Verdict result={r} dealer={dealer.name} lastOfThree={r.outcome === 'miss' && g.misses >= MISSES_TO_PASS} />
        ) : (
          <div className="ftd-ask">
            <span className="ftd-guesser">
              <span className="bd-avatar xs" style={{ background: guesser.color }}>
                {guesser.avatar}
              </span>
              <span className="ftd-guesser-name">{guesser.name}</span>
            </span>
            <h2 className={`ftd-question${dir ? ' hint' : ''}`}>
              {dir === 'higher' ? t('It’s higher ⬆') : dir === 'lower' ? t('It’s lower ⬇') : t('Which card?')}
            </h2>
            <p className="ftd-ask-sub">
              {g.firstGuess != null
                ? t('First guess: {rank}. Last try!', { rank: rankLabel(g.firstGuess) })
                : !known
                  ? t('{name} has the deck and types in the guess.', { name: dealer.name })
                  : null}
            </p>
            <Misses n={g.misses} />
          </div>
        )}
      </div>
    </div>
  );
}

function Tally({ session }: { session: Session }) {
  return (
    <section className="panel">
      <h3 className="section-title">{t('Drunk as dealer')}</h3>
      <div className="ftd-tally">
        {session.seats
          .map((p, i) => ({ p, n: session.game.drank[i] }))
          .sort((a, b) => b.n - a.n)
          .map(({ p, n }) => (
            <div key={p.id} className="ftd-tally-row">
              <span className="bd-avatar xs" style={{ background: p.color }}>
                {p.avatar}
              </span>
              <span className="ftd-tally-name">{p.name}</span>
              <span className="ftd-tally-num">{n === 1 ? t('1 sip') : t('{n} sips', { n })}</span>
            </div>
          ))}
      </div>
    </section>
  );
}

/* ---------------- Second phone: the deck, in the dealer's hand ---------------- */

function DeckView({ session, act }: { session: Session; act: (a: Act) => void }) {
  const known = useApp().knows('fuck-the-dealer');
  const [peek, setPeek] = useState(false);
  const g = session.game;
  const seats = session.seats;
  const dealer = seats[g.dealer];
  const r = g.result;
  const out = 52 - g.deck.length;

  // Feel it in the hand when a guess is settled.
  const outcome = r?.outcome;
  useEffect(() => {
    if (outcome === 'first') buzz([40, 30, 40, 30, 80]);
    else if (outcome) buzz(30);
  }, [outcome, out]);

  if (g.handover) {
    return (
      <Handover session={session}>
        {g.over ? (
          <p className="lead center">{t('Game over. The table shows who drank what.')}</p>
        ) : (
          <div className="sticky-action">
            <p className="ftd-pass">{t('Pass this phone to {name}.', { name: dealer.name })}</p>
            <BigButton size="xl" onClick={() => act({ t: 'take', at: stamp(g) })}>
              {t('{name} takes the deck', { name: dealer.name })}
            </BigButton>
          </div>
        )}
      </Handover>
    );
  }

  const guesser = seats[g.guesser];
  const dir = g.firstGuess != null && g.deck.length ? direction(g.firstGuess, g.deck[0].value) : null;
  const card = r ? r.card : g.deck[0];
  const lastOfThree = r?.outcome === 'miss' && g.misses >= MISSES_TO_PASS;

  return (
    <div className="ftd ftd-deckphone fill">
      <div className="ftd-deckphone-head">
        <span className="kicker">{t('Deck · {name} deals', { name: dealer.name })}</span>
        <span className="ftd-deckphone-ask">
          {r ? null : dir ? (
            <span className="ftd-question hint">{dir === 'higher' ? t('It’s higher ⬆') : t('It’s lower ⬇')}</span>
          ) : (
            <NextName text={t('Ask {name}: Which card?')} name={guesser.name} />
          )}
        </span>
      </div>

      <div
        className={`ftd-deck big${g.deck.length > 1 ? ' stacked' : ''}`}
        onPointerDown={() => !r && setPeek(true)}
        onPointerUp={() => setPeek(false)}
        onPointerLeave={() => setPeek(false)}
        onPointerCancel={() => setPeek(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {card ? <PlayingCard key={r ? out - 1 : out} card={card} faceUp={peek || !!r} size="xl" /> : <span className="ftd-deck-empty" />}
        {!known && <span className={`ftd-peek-hint${r ? ' off' : ''}`}>{t('Hold to peek, don’t let anyone see')}</span>}
      </div>

      {!r ? (
        <>
          <p className="ftd-ask-sub center">
            {g.firstGuess != null
              ? t('First guess: {rank}. Last try!', { rank: rankLabel(g.firstGuess) })
              : !known
                ? t('Tap the value {name} says.', { name: guesser.name })
                : null}
          </p>
          <div className="ftd-pad">
            {VALUES.map((v) => (
              <button
                key={v}
                type="button"
                className={`ftd-rank${v === g.firstGuess ? ' crossed' : ''}${possible(g, v) ? '' : ' unlikely'}`}
                // Whatever the guesser says can be entered (a wrong-side second guess is a miss);
                // values that can't be the card are only dimmed.
                disabled={v === g.firstGuess}
                onClick={() => {
                  sfx.tick();
                  buzz(15);
                  setPeek(false);
                  act({ t: 'guess', value: v, at: stamp(g) });
                }}
              >
                {rankLabel(v)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Verdict result={r} dealer={dealer.name} lastOfThree={lastOfThree} />
          <div className="sticky-action">
            <BigButton size="xl" variant={lastOfThree || !g.deck.length ? 'primary' : 'light'} onClick={() => act({ t: 'next', at: stamp(g) })}>
              {!g.deck.length ? (
                t('Finish game')
              ) : lastOfThree ? (
                t('Pass the deck →')
              ) : (
                <NextName text={t('Next: {name} →')} name={seats[nextGuesser(g.guesser, g.dealer, seats.length)].name} />
              )}
            </BigButton>
          </div>
        </>
      )}
    </div>
  );
}

function Verdict({ result, dealer, lastOfThree }: { result: NonNullable<Game['result']>; dealer: string; lastOfThree: boolean }) {
  const card = cardName(result.card);
  const [tone, emoji, title, sub] =
    result.outcome === 'first'
      ? ['correct', '🎯', t('Bullseye!'), t('{name} gets 6 sips.', { name: dealer })]
      : result.outcome === 'second'
        ? ['same', '👌', t('Got it!'), t('{name} gets 3 sips.', { name: dealer })]
        : ['wrong', '🙅', t('Missed!'), lastOfThree ? t('Third miss in a row: the deck moves on.') : t('Nobody drinks.')];
  return (
    <div className={`bd-result ${tone}`}>
      <span className="bd-result-emoji">{emoji}</span>
      <span className="bd-result-text">
        <span className="bd-result-title">{title}</span>
        <span className="bd-result-sub">{sub}</span>
        <span className="bd-result-card">{t('It was {card}', { card })}</span>
      </span>
    </div>
  );
}

/** Misses in a row, out of three: the third one moves the deck on. */
function Misses({ n }: { n: number }) {
  return (
    <span className="ftd-misses" aria-label={t('{n} of 3 misses in a row', { n })}>
      {Array.from({ length: MISSES_TO_PASS }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
      <span className="ftd-misses-label">{t('misses in a row')}</span>
    </span>
  );
}

/** A small number from a card, stable across renders, so every card keeps its messy spot on its pile. */
function wobble(card: Card, salt: number) {
  const h = Math.imul(card.value * 97 + SUITS.indexOf(card.suit) * 31 + salt * 7919, 2654435761) >>> 0;
  return (h % 1000) / 1000 - 0.5;
}

/**
 * The middle of the table: one pile per value from 2 to Ace, a little messy like real cards.
 * Once all four of a value are out, the pile is turned over.
 */
function Table({ g, hide, flight }: { g: Game; hide: Card | null; flight: { value: number; from: DOMRect; key: number } | null }) {
  const piles = useRef<Record<number, HTMLDivElement | null>>({});
  // The card flies from the deck onto its pile (measured, then animated back from where it came).
  useLayoutEffect(() => {
    if (!flight || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const top = piles.current[flight.value]?.querySelector<HTMLElement>('.ftd-card:last-of-type');
    if (!top) return;
    const to = top.getBoundingClientRect();
    const dx = flight.from.left + flight.from.width / 2 - (to.left + to.width / 2);
    const dy = flight.from.top + flight.from.height / 2 - (to.top + to.height / 2);
    top.animate([{ translate: `${dx}px ${dy}px`, scale: `${flight.from.width / to.width}`, zIndex: 5 }, { translate: '0 0', scale: '1', zIndex: 5 }], {
      duration: 520,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }, [flight]);

  // Three rows (2–6, 7–10, J–A) so the cards can be big.
  const rows = [VALUES.slice(0, 5), VALUES.slice(5, 9), VALUES.slice(9)];
  return (
    <div className="ftd-table">
      {rows.map((row, r) => (
        <div key={r} className="ftd-row">
          {row.map((v) => {
        const pile = g.piles[v - 2].filter((c) => c !== hide);
        const full = pile.length === 4;
        return (
          <div key={v} className="ftd-pile" ref={(el) => void (piles.current[v] = el)}>
            <div className="ftd-pile-cards">
              {pile.length === 0 && <span className="ftd-pile-empty">{rankLabel(v)}</span>}
              {pile.map((c, j) => (
                <span
                  key={`${c.value}${c.suit}`}
                  className={`ftd-card ${full && j === 3 ? 'back' : cardColor(c)}`}
                  style={
                    {
                      '--rot': `${wobble(c, 1) * 16}deg`,
                      '--dx': `${wobble(c, 2) * 8 - j * 1.5}%`,
                      '--dy': `${wobble(c, 3) * 6 - j * 4}%`,
                    } as CSSProperties
                  }
                >
                  {!(full && j === 3) && (
                    <>
                      <span className="ftd-card-rank">{rankLabel(c.value)}</span>
                      <Suit suit={c.suit} className="ftd-card-suit" />
                    </>
                  )}
                </span>
              ))}
            </div>
            <span className="ftd-pile-count" aria-label={t('{n} of 4 out', { n: pile.length })}>
              {[0, 1, 2, 3].map((k) => (
                <i key={k} className={k < pile.length ? 'on' : ''} />
              ))}
            </span>
          </div>
        );
          })}
        </div>
      ))}
    </div>
  );
}
