import { useState, type CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import HandFan from '../../components/HandFan';
import Sheet from '../../components/Sheet';
import Tap from '../../components/Tap';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { sortByColour, useSortedHand } from '../../lib/handSort';
import { useShared } from '../../net/shared';
import { useApp } from '../../state/AppState';
import {
  acceptOverload,
  callLast,
  catchLast,
  challengeOverload,
  COLORS,
  draw,
  MAX_PLAYERS,
  MIN_PLAYERS,
  newGame,
  pass,
  play,
  playable,
  top,
  type Card,
  type Color,
  type Entry,
  type Game,
} from './logic';

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
export const COLOR_NAME: Record<Color, string> = { crimson: tx('Crimson'), azure: tx('Azure'), amber: tx('Amber'), jade: tx('Jade') };
const KIND_NAME: Record<Card['kind'], string> = {
  number: '',
  block: tx('Block'),
  turnaround: tx('Turnaround'),
  burden: tx('Burden'),
  spectrum: tx('Spectrum'),
  overload: tx('Overload'),
};
const LABEL: Partial<Record<Card['kind'], string>> = { block: '⊘', turnaround: '↻', burden: '+2', spectrum: '✦', overload: '+4' };

/** Color Clash: every player on their own phone, their hand at the bottom. */
export default function ColorClash() {
  const { state, set, room, isHost, myId } = useShared<Shared>('clash', { g: null, seats: [] });
  const known = useApp().knows('color-clash');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[] | null>(null);

  if (!state.g || state.seats.length < MIN_PLAYERS) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <h2 className="bd-title">{t('Color Clash')}</h2>
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
          <span className="kicker">{t('2 to 10 players, 7 cards each')}</span>
          <h2 className="bd-title big">{t('Color Clash')}</h2>
          {!known && <p className="lead">{t('Match the colour, the number or the action. First one out of cards wins.')}</p>}
        </div>
        <div className="cc-sample" aria-hidden>
          {COLORS.map((c, i) => (
            <CardFace key={c} card={{ id: -1 - i, color: c, kind: 'number', value: 7 }} />
          ))}
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
        <div className="sticky-action">
          <BigButton size="xl" disabled={seats.length < MIN_PLAYERS} onClick={() => set({ g: newGame(seats.length), seats })}>
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
  const [wild, setWild] = useState<Card | null>(null);
  const [sorted, toggleSort] = useSortedHand();
  const name = (i: number) => seats[i]?.name ?? t('Someone');
  const hand = me >= 0 ? g.hands[me] : [];
  const shown = sorted ? sortByColour(hand, (c) => c.color, worth, COLORS) : hand;
  const myTurn = me >= 0 && g.turn === me && g.winner == null && !g.overload;
  const facing = me >= 0 && g.overload?.target === me;
  const canCall = me >= 0 && ((g.lastCard?.seat === me && !g.lastCard.called) || (myTurn && hand.length === 2 && g.calling !== me));
  const canCatch = me >= 0 && !!g.lastCard && !g.lastCard.called && g.lastCard.seat !== me;
  const topCard = top(g);

  if (g.winner != null) {
    return (
      <div className="bd">
        <div className="bd-head center">
          <h2 className="bd-title big">{g.winner === me ? t('You’re out of cards: you win!') : t('{name} is out of cards and wins!', { name: name(g.winner) })}</h2>
        </div>
        <div className="cc-results">
          {seats.map((s, i) => (
            <span key={s.id} className="cc-result">
              <span className="bd-avatar xs" style={{ background: s.color }}>
                <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
              </span>
              <span>{s.name}</span>
              <span className="cc-result-n">{t('{n} cards', { n: g.hands[i].length })}</span>
            </span>
          ))}
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

  const status = facing
    ? t('An Overload for you: take it or challenge it')
    : g.overload
      ? t('{name} decides on the Overload', { name: name(g.overload.target) })
      : myTurn
        ? g.drawn != null
          ? t('Play the card you drew, or keep it')
          : t('Your turn')
        : t('{name}’s turn', { name: name(g.turn) });

  const onCard = (c: Card) => {
    if (!myTurn || !playable(g, me, c)) return;
    if (!c.color) return setWild(c);
    sfx.pop();
    buzz(10);
    act((x) => play(x, me, c.id));
  };

  return (
    <div className="cc fill">
      <div className="cc-others">
        {seats.map((s, i) =>
          i === me ? null : (
            <div key={s.id} className={`cc-seat${g.turn === i ? ' on' : ''}${g.hands[i].length === 1 ? ' last' : ''}`}>
              {/* Their hand, face down: as many cards as they hold, the number with it. */}
              <Backs n={g.hands[i].length} label={t('{name}: {n} cards', { name: s.name, n: g.hands[i].length })} />
              <span className="cc-seat-who">
                <span className="bd-avatar xs" style={{ background: s.color }}>
                  <Avatar avatar={s.avatar} photo={photoOf(s.id)} />
                </span>
                <span className="cc-seat-name">{s.name}</span>
              </span>
            </div>
          ),
        )}
      </div>

      <div className="cc-middle">
        <button type="button" className="cc-deck" disabled={!myTurn || g.drawn != null} onClick={() => act((x) => draw(x, me))} aria-label={t('Draw a card')}>
          <span className="cc-back" />
          <span className="cc-deck-label">{t('Draw')}</span>
        </button>
        <div className={`cc-pile ${g.color}`} aria-label={t('Top card; the colour is {color}', { color: t(COLOR_NAME[g.color]) })}>
          <CardFace card={topCard} big />
          <span className="cc-active">
            <Shape color={g.color} />
            {t(COLOR_NAME[g.color])}
          </span>
        </div>
      </div>

      <p className="cc-status" aria-live="polite">
        {status}
        <span className="cc-dir">{g.dir === 1 ? '↻' : '↺'}</span>
      </p>
      <p className="cc-last">{g.last ? lastText(g.last, name) : ' '}</p>

      <div className="cc-actions">
        {canCall && (
          <button type="button" className="cc-call" onClick={() => act((x) => callLast(x, me))}>
            {t('Last card!')}
          </button>
        )}
        {canCatch && (
          <button
            type="button"
            className="cc-catch"
            onClick={() => {
              buzz([20, 30, 20]);
              act((x) => catchLast(x, me));
            }}
          >
            {t('Caught {name}!', { name: name(g.lastCard!.seat) })}
          </button>
        )}
        {myTurn && g.drawn != null && (
          <button type="button" className="cc-pass" onClick={() => act((x) => pass(x, me))}>
            {t('Keep it')}
          </button>
        )}
      </div>

      {/* Your hand, fanned as you'd hold it: what you may play now stands up. */}
      {me >= 0 ? (
        <HandFan
          className="cc-fan"
          cards={shown}
          keyOf={(c) => c.id}
          width={hand.length <= 8 ? 70 : hand.length <= 14 ? 62 : 54}
          ratio={1.33}
          sorted={sorted}
          onSort={toggleSort}
          label={t('Your hand')}
          card={(c) => {
            const ok = myTurn && playable(g, me, c);
            return (
              <button type="button" className={`cc-hand-card${ok ? ' ok' : ''}${myTurn && !ok ? ' dim' : ''}`} disabled={!ok} onClick={() => onCard(c)} aria-label={cardName(c)}>
                <CardFace card={c} />
              </button>
            );
          }}
        />
      ) : (
        <p className="fine-print">{t('Watching')}</p>
      )}

      {/* Which colour, for a Spectrum or an Overload. */}
      <Sheet open={!!wild} onClose={() => setWild(null)} title={t('Which colour?')} closeLabel={t('Cancel')}>
        <div className="cc-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`cc-color ${c}`}
              onClick={() => {
                const card = wild;
                setWild(null);
                if (!card) return;
                sfx.pop();
                buzz(10);
                act((x) => play(x, me, card.id, c));
              }}
            >
              <Shape color={c} />
              <span>{t(COLOR_NAME[c])}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* An Overload on you: take the four, or challenge it. */}
      <Sheet open={facing} onClose={() => act((x) => acceptOverload(x, me))} title={t('{name} played an Overload', { name: name(g.overload?.actor ?? 0) })} closeLabel={t('Take 4 cards')}>
        <p className="lead">{t('Challenge it if you think they still had a card of the colour before. Right: they draw 4. Wrong: you draw 6.')}</p>
        <BigButton
          variant="danger"
          onClick={() => {
            buzz([20, 40, 20]);
            act((x) => challengeOverload(x, me));
          }}
        >
          {t('Challenge')}
        </BigButton>
      </Sheet>
    </div>
  );
}

function cardName(c: Card) {
  if (c.kind === 'number') return `${t(COLOR_NAME[c.color!])} ${c.value}`;
  return c.color ? `${t(COLOR_NAME[c.color])} ${t(KIND_NAME[c.kind])}` : t(KIND_NAME[c.kind]);
}

function lastText(e: Entry, name: (i: number) => string) {
  switch (e.k) {
    case 'play':
      return t('{name} plays {card}.', { name: name(e.by), card: cardName(e.card) });
    case 'draw':
      return t('{name} draws a card.', { name: name(e.by) });
    case 'skip':
      return e.draws ? t('{name} draws {n} and sits out.', { name: name(e.by), n: e.draws }) : t('{name} sits out.', { name: name(e.by) });
    case 'caught':
      return t('{name} caught {caller} with one card: {caller} draws 2.', { name: name(e.by), caller: name(e.caller) });
    case 'called':
      return t('{name}: last card!', { name: name(e.by) });
    case 'challenge':
      return e.fair
        ? t('{name} challenged the Overload and was wrong: draws 6.', { name: name(e.by) })
        : t('{name} challenged the Overload and was right: {actor} draws 4.', { name: name(e.by), actor: name(e.actor) });
  }
}

/** A card's place in a sorted hand within its colour: numbers, then Block, Turnaround, Burden, then the universal ones. */
const ORDER: Record<Card['kind'], number> = { number: 0, block: 10, turnaround: 11, burden: 12, spectrum: 20, overload: 21 };
const worth = (c: Card) => ORDER[c.kind] + (c.value ?? 0);

/** A hand face down, as many cards as it holds (a few at most, fanned), with the number beside. */
function Backs({ n, label }: { n: number; label: string }) {
  const shown = Math.min(n, 9);
  return (
    <span className="cc-backs" role="img" aria-label={label}>
      <span className="cc-backs-fan">
        {Array.from({ length: shown }, (_, k) => (
          <i key={k} className="cc-back" style={{ '--k': k - (shown - 1) / 2 } as CSSProperties} />
        ))}
      </span>
      <span className="cc-backs-n">{n}</span>
    </span>
  );
}

/** The colour's own shape: a diamond, a circle, a triangle, a square. */
export function Shape({ color }: { color: Color }) {
  return (
    <svg className="cc-shape" viewBox="0 0 40 40" aria-hidden>
      {color === 'crimson' && <path d="M20 3 37 20 20 37 3 20Z" />}
      {color === 'azure' && <circle cx="20" cy="20" r="16" />}
      {color === 'amber' && <path d="M17.4 6.5a3 3 0 0 1 5.2 0l13 22.5a3 3 0 0 1-2.6 4.5H7a3 3 0 0 1-2.6-4.5Z" />}
      {color === 'jade' && <rect x="5" y="5" width="30" height="30" rx="6" />}
    </svg>
  );
}

/** A card: its colour, its shape and its number (or action); a universal one dark with all four. */
export function CardFace({ card, big }: { card: Card; big?: boolean }) {
  const label = card.kind === 'number' ? String(card.value) : LABEL[card.kind];
  return (
    <span className={`cc-card ${card.color ?? 'universal'}${big ? ' big' : ''}`}>
      {card.color ? (
        <Shape color={card.color} />
      ) : (
        <span className="cc-quad" aria-hidden>
          {COLORS.map((c) => (
            <Shape key={c} color={c} />
          ))}
        </span>
      )}
      <span className="cc-num">{label}</span>
    </span>
  );
}
