import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import HandFan from '../../components/HandFan';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { sortByColour, useSortedHand } from '../../lib/handSort';
import { mix, parseColor, tintTop } from '../../lib/themeColor';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import art from './art.webp';
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
  useTrumpSky(g.trump);
  const trumpText = g.trump ? (
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
            {g.turned ? <CardFace card={g.turned} /> : <CardBack />}
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
              <Sigil faction={f} on /> {t(FACTION_NAME[f])}
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

      {/* Your hand, fanned as you'd hold it: what you may play now stands up. */}
      {me >= 0 ? (
        <HandFan
          className="fz-fan"
          cards={shown}
          keyOf={(c) => c.id}
          width={hand.length <= 8 ? 76 : hand.length <= 13 ? 66 : 58}
          ratio={1.5}
          sorted={sorted}
          onSort={toggleSort}
          label={t('Your hand')}
          card={(c) => {
            const ok = g.phase === 'playing' && mine && legal(g, me, c);
            return (
              <button
                type="button"
                className={`fz-hand-card${ok ? ' ok' : ''}${g.phase === 'playing' && mine && !ok ? ' dim' : ''}`}
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
          }}
        />
      ) : (
        <p className="fine-print">{t('Watching')}</p>
      )}
    </div>
  );
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
    const ground = getComputedStyle(root).getPropertyValue('--bg').trim();
    const c = parseColor(ground);
    const dark = !c || c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 < 128;
    const sky = mix(ground, FACTION_COLOR[trump], dark ? 0.34 : 0.22);
    root.style.setProperty('--bg', sky);
    const release = tintTop(sky);
    return () => {
      if (own) root.style.setProperty('--bg', own);
      else root.style.removeProperty('--bg');
      release();
    };
  }, [trump]);
}

/** A faction's sign, as on the back of the cards: a flame, a drop, a leaf, a star. */
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

/** The art of a card, from the sheet (art.webp, 8 across, 7 down): the four factions' 1 to 12, then four Archmages, four Fools. */
function artAt(i: number): CSSProperties {
  return { backgroundImage: `url(${art})`, backgroundPosition: `${((i % 8) / 7) * 100}% ${(Math.floor(i / 8) / 6) * 100}%` };
}

function CardFace({ card }: { card: Card }) {
  if (card.kind !== 'number') {
    const v = (card.id >> 1) % 4;
    return <span className={`fz-card ${card.kind}`} role="img" aria-label={card.kind === 'archmage' ? t('Archmage') : t('Fool')} style={artAt(48 + (card.kind === 'fool' ? 4 : 0) + v)} />;
  }
  const f = card.faction;
  return (
    <span className={`fz-card ${f}`} role="img" aria-label={`${t(FACTION_NAME[f])} ${card.rank}`} style={card.rank <= 12 ? artAt(FACTIONS.indexOf(f) * 12 + card.rank - 1) : undefined}>
      {/* The 13 of each faction is its seal: the sign big in the rings of the back. */}
      {card.rank === 13 && (
        <span className="fz-seal">
          <Sigil faction={f} />
        </span>
      )}
      <span className="fz-index">
        <span className="fz-rank">{card.rank}</span>
        <Sigil faction={f} />
      </span>
    </span>
  );
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
