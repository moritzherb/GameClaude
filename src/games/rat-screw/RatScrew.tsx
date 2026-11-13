import { useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import { CardFace } from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import { isJoker, MAX_PLAYERS, MIN_PLAYERS, newGame, play, slap, slapRule, take, type Card, type Entry, type Game, type SlapRule } from './logic';

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
const RULE_NAME: Record<SlapRule, string> = {
  joker: tx('Joker'),
  double: tx('Double'),
  sandwich: tx('Sandwich'),
  'top-bottom': tx('Top bottom'),
  tens: tx('Tens'),
  run: tx('Four in a row'),
  marriage: tx('Marriage'),
};

/** How many of the middle's top cards show, fanned (the ones before peeking out under it). */
const FAN = 5;

/** Egyptian Rat Screw: everyone on their own phone, their pile in front of them, one Slap button. */
export default function RatScrew() {
  const { state, set, room, isHost, myId } = useShared<Shared>('ers', { g: null, seats: [] });
  const known = useApp().knows('rat-screw');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [jokers, setJokers] = useState(false);

  /* ---------- Lobby ---------- */
  if (!state.g || state.seats.length < MIN_PLAYERS) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <h2 className="bd-title">{t('Egyptian Rat Screw')}</h2>
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
          <span className="kicker">{t('2 to 8 players, every card dealt')}</span>
          <h2 className="bd-title big">{t('Egyptian Rat Screw')}</h2>
          {!known && <p className="lead">{t('Play your top card in turn. Slap the pile when the cards allow it: the first slap takes it all.')}</p>}
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
          <button type="button" role="switch" aria-checked={jokers} className={`setting-row${jokers ? ' on' : ''}`} onClick={() => setJokers(!jokers)}>
            <span className="setting-text">
              <span className="setting-label">{t('With Jokers')}</span>
              <span className="setting-hint">{t('Two Jokers in the deck: a Joker on the pile may always be slapped.')}</span>
            </span>
            <span className="switch">
              <span className="switch-knob" />
            </span>
          </button>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" disabled={seats.length < MIN_PLAYERS} onClick={() => set({ g: newGame(seats.length, jokers), seats })}>
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
      act={(next) => set((s) => (s.g ? { ...s, g: next(s.g) } : s))}
      onNewGame={() => set((s) => ({ ...s, g: null }))}
      isHost={isHost}
    />
  );
}

function Table({
  g,
  seats,
  me,
  photoOf,
  act,
  onNewGame,
  isHost,
}: {
  g: Game;
  seats: Seat[];
  me: number;
  photoOf: (id: string) => string | undefined;
  act: (next: (g: Game) => Game) => void;
  onNewGame: () => void;
  isHost: boolean;
}) {
  const name = (i: number) => seats[i]?.name ?? t('Someone');
  const mine = me >= 0 ? g.piles[me] : [];
  const myTurn = me >= 0 && g.turn === me && g.claim == null && g.winner == null && mine.length > 0;
  const myClaim = me >= 0 && g.claim === me;
  const out = me >= 0 && g.out[me];
  const others = seats.map((s, i) => ({ s, i })).filter(({ i }) => i !== me);
  const fan = g.middle.slice(-FAN);

  if (g.winner != null) {
    return (
      <div className="bd rs-over">
        <div className="bd-head center">
          <h2 className="bd-title big">{g.winner === me ? t('You have every card!') : t('{name} has every card!', { name: name(g.winner) })}</h2>
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

  const status =
    g.claim != null
      ? myClaim
        ? t('The pile is yours: take it')
        : t('{name} wins the pile', { name: name(g.claim) })
      : g.challenger != null
        ? g.turn === me
          ? t('A face card: answer it, {n} tries', { n: g.tries })
          : t('{name} has {n} tries', { name: name(g.turn), n: g.tries })
        : myTurn
          ? t('Your turn')
          : t('{name}’s turn', { name: name(g.turn) });

  return (
    <div className="rs fill">
      {/* Everyone else: their pile in front of them, as many cards as they hold. */}
      <div className="rs-others">
        {others.map(({ s, i }) => (
          <div key={s.id} className={`rs-seat${g.turn === i && g.claim == null ? ' on' : ''}${g.out[i] ? ' out' : ''}`}>
            <span className="rs-seat-who">
              <span className="bd-avatar xs" style={{ background: s.color }}>
                <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
              </span>
              <span className="rs-seat-name">{s.name}</span>
            </span>
            <Stack n={g.piles[i].length} label={t('{name}: {n} cards', { name: s.name, n: g.piles[i].length })} />
          </div>
        ))}
      </div>

      <p className="rs-status" aria-live="polite">
        {status}
      </p>

      {/* The middle: the top card, the ones before it peeking out under it. */}
      <div className="rs-middle" aria-label={t('{n} cards in the middle', { n: g.middle.length })}>
        {fan.map((c, k) => (
          <div key={`${g.middle.length - fan.length + k}`} className="rs-fan-card" style={{ '--k': k - (fan.length - 1), '--tilt': `${((g.middle.length - fan.length + k) * 37) % 13 - 6}deg` } as CSSProperties}>
            <Face card={c} />
          </div>
        ))}
        {g.middle.length > FAN && <span className="rs-middle-more">+{g.middle.length - FAN}</span>}
        {myClaim && (
          <BigButton
            className="rs-take"
            onClick={() => {
              sfx.pop();
              buzz([20, 40, 20]);
              act((x) => take(x, me));
            }}
          >
            {t('Take the pile')}
          </BigButton>
        )}
      </div>

      <p className="rs-last">{g.last ? lastText(g.last, name) : ' '}</p>

      {/* You: your pile bottom left (tap it to play), the Slap button bottom right. */}
      <div className="rs-me">
        <button
          type="button"
          className={`rs-mine${myTurn ? ' go' : ''}`}
          disabled={!myTurn}
          aria-label={myTurn ? t('Play your top card') : t('Your pile: {n} cards', { n: mine.length })}
          onClick={() => {
            sfx.tick();
            buzz(10);
            act((x) => play(x, me));
          }}
        >
          <Stack n={mine.length} big label="" />
          <span className="rs-mine-label">{myTurn ? t('Tap to play') : me >= 0 ? t('{n} cards', { n: mine.length }) : t('Watching')}</span>
        </button>
        {me >= 0 && (
          <button
            type="button"
            className="rs-slap"
            disabled={out}
            onClick={() => {
              const right = !!slapRule(g.middle);
              buzz(right ? [30, 30, 60] : 40);
              if (right) celebrate();
              else sfx.boo();
              act((x) => slap(x, me));
            }}
          >
            {out ? t('Out') : t('Slap!')}
          </button>
        )}
      </div>
    </div>
  );
}

function lastText(e: Entry, name: (i: number) => string) {
  const who = name;
  if (e.k === 'slap') return t('{name} slaps: {rule}. The pile ({n}) is theirs.', { name: who(e.by), rule: t(RULE_NAME[e.rule]), n: e.n });
  if (e.k === 'wrong') return t('{name} slapped wrong: a card under the pile.', { name: who(e.by) });
  if (e.k === 'out') return t('{name} slapped wrong without cards: out.', { name: who(e.by) });
  return t('{name} takes the pile ({n}).', { name: who(e.by), n: e.n });
}

/** A face-down pile, as thick as the cards in it (a hair per card), never a number. */
function Stack({ n, big, label }: { n: number; big?: boolean; label: string }) {
  const layers = Math.min(n, 60);
  return (
    <span className={`rs-stack${big ? ' big' : ''}${n ? '' : ' empty'}`} role={label ? 'img' : undefined} aria-label={label || undefined} style={{ '--n': layers } as CSSProperties}>
      {Array.from({ length: layers }, (_, k) => (
        <i key={k} style={{ '--k': k } as CSSProperties} />
      ))}
    </span>
  );
}

/** A card's face; a Joker drawn on its own (the deck has none). */
function Face({ card }: { card: Card }) {
  if (isJoker(card))
    return (
      <div className="pcard-face pcard-front rs-joker">
        <span>{t('Joker')}</span>
      </div>
    );
  return <CardFace card={card as Parameters<typeof CardFace>[0]['card']} />;
}
