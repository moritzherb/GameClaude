import { useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import { bid, chooseTrump, FACTIONS, legal, MAX_PLAYERS, maxRounds, MIN_PLAYERS, newGame, nextRound, playCard, QUICK_ROUNDS, type Card, type Faction, type Game } from './logic';

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
const FACTION_GLYPH: Record<Faction, string> = { fire: '🔥', water: '💧', nature: '🌿', astral: '✨' };

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
  const hand = me >= 0 ? g.hands[me] : [];
  const mine = g.turn === me;
  const trumpText = g.trump ? `${FACTION_GLYPH[g.trump]} ${t(FACTION_NAME[g.trump])}` : g.phase === 'trump' ? t('The dealer picks') : t('No trump');

  if (g.phase === 'summary' || g.phase === 'over') {
    const order = seats.map((s, i) => ({ s, i })).sort((a, b) => (g.phase === 'over' ? g.scores[b.i] - g.scores[a.i] : 0));
    return (
      <div className="bd">
        <div className="bd-head center">
          <span className="kicker">{t('Round {n} of {m}', { n: g.round, m: g.rounds })}</span>
          <h2 className="bd-title big">{g.phase === 'over' ? t('{name} wins!', { name: name(order[0].i) }) : t('Round over')}</h2>
        </div>
        {g.lastTrick && (
          <div className="fz-trick small" aria-label={t('{name} takes the trick', { name: name(g.lastTrick.winner) })}>
            {g.lastTrick.cards.map((p) => (
              <div key={p.card.id} className={`fz-trick-card done${g.lastTrick!.winner === p.seat ? ' won' : ''}`}>
                <CardFace card={p.card} />
                <span className="fz-trick-who">{name(p.seat)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="fz-table">
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

  const status =
    g.phase === 'trump'
      ? mine
        ? t('An Archmage was turned: you pick trump')
        : t('{name} picks trump', { name: name(g.dealer) })
      : g.phase === 'bidding'
        ? mine
          ? t('How many tricks will you take?')
          : t('{name} is bidding', { name: name(g.turn) })
        : mine
          ? t('Your card')
          : t('{name}’s card', { name: name(g.turn) });

  return (
    <div className="fz fill">
      <div className="fz-top">
        <span className="fz-round">{t('Round {n} of {m}', { n: g.round, m: g.rounds })}</span>
        <span className="fz-trump">
          {t('Trump')}: {trumpText}
        </span>
      </div>

      {/* Everyone: their bid, the tricks they have, their score. */}
      <div className="fz-seats">
        {seats.map((s, i) => (
          <div key={s.id} className={`fz-seat${g.turn === i ? ' on' : ''}${i === me ? ' me' : ''}`}>
            <span className="bd-avatar xs" style={{ background: s.color }}>
              <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
            </span>
            <span className="fz-seat-text">
              <span className="fz-seat-name">{s.name}</span>
              <span className="fz-seat-meta">
                <span className="fz-seat-bid">{g.bids[i] == null ? '–' : t('{won}/{bid}', { won: g.won[i], bid: g.bids[i]! })}</span>
                <span className="fz-seat-score">{t('{n} pts', { n: g.scores[i] })}</span>
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* The trick on the table (or the one just taken). */}
      <div className="fz-trick">
        {(g.trick.length ? g.trick : (g.lastTrick?.cards ?? [])).map((p) => (
          <div key={p.card.id} className={`fz-trick-card${!g.trick.length && g.lastTrick?.winner === p.seat ? ' won' : ''}${!g.trick.length ? ' done' : ''}`}>
            <CardFace card={p.card} />
            <span className="fz-trick-who">{name(p.seat)}</span>
          </div>
        ))}
        {!g.trick.length && g.lastTrick && <p className="fz-took">{t('{name} takes the trick', { name: name(g.lastTrick.winner) })}</p>}
        {/* Before the first card: the card turned up for trump. */}
        {!g.trick.length && !g.lastTrick && (
          <div className="fz-trick-card turned">
            {g.turned ? <CardFace card={g.turned} /> : <span className="fz-card back" />}
            <span className="fz-trick-who">{t('Turned up')}</span>
          </div>
        )}
      </div>

      <p className="fz-status" aria-live="polite">
        {status}
      </p>

      {g.phase === 'trump' && mine && (
        <div className="fz-picks">
          {FACTIONS.map((f) => (
            <button key={f} type="button" className={`fz-pick ${f}`} onClick={() => act((x) => chooseTrump(x, me, f))}>
              {FACTION_GLYPH[f]} {t(FACTION_NAME[f])}
            </button>
          ))}
        </div>
      )}
      {g.phase === 'bidding' && mine && (
        <div className="fz-picks">
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
      )}

      {/* Your hand: what you may play now stands up. Many cards: two rows, overlapping. */}
      <div className="fz-hand" aria-label={t('Your hand')}>
        {rows([...hand].sort(order)).map((row, r) => (
          <div key={r} className="fz-hand-row" style={{ '--n': row.length } as CSSProperties}>
            {row.map((c) => {
              const ok = g.phase === 'playing' && mine && legal(g, me, c);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`fz-hand-card${ok ? ' ok' : ''}`}
                  disabled={!ok}
                  onClick={() => {
                    sfx.pop();
                    buzz(10);
                    act((x) => playCard(x, me, c.id));
                  }}
                >
                  <CardFace card={c} />
                </button>
              );
            })}
          </div>
        ))}
        {me < 0 && <p className="fine-print">{t('Watching')}</p>}
      </div>
    </div>
  );
}

/** Up to 10 cards in one row; more in two. */
function rows(cards: Card[]) {
  if (cards.length <= 10) return [cards];
  const top = Math.floor(cards.length / 2);
  return [cards.slice(0, top), cards.slice(top)];
}

/** A hand in order: Archmages, then the factions by rank, then the Fools. */
function order(a: Card, b: Card) {
  const key = (c: Card) => (c.kind === 'number' ? FACTIONS.indexOf(c.faction) * 14 + c.rank : c.kind === 'archmage' ? -1 : 99);
  return key(a) - key(b);
}

function CardFace({ card }: { card: Card }) {
  if (card.kind !== 'number')
    return (
      <span className={`fz-card ${card.kind}`}>
        <span className="fz-card-glyph">{card.kind === 'archmage' ? '🧙' : '🃏'}</span>
        <span className="fz-card-name">{card.kind === 'archmage' ? t('Archmage') : t('Fool')}</span>
      </span>
    );
  return (
    <span className={`fz-card ${card.faction}`} aria-label={`${t(FACTION_NAME[card.faction])} ${card.rank}`}>
      <span className="fz-card-rank">{card.rank}</span>
      <span className="fz-card-glyph">{FACTION_GLYPH[card.faction]}</span>
    </span>
  );
}
