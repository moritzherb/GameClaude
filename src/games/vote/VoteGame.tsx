import { useState, type CSSProperties, type ReactNode } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Finished from '../../components/Finished';
import NextName from '../../components/NextName';
import { t } from '../../i18n';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick, shuffle } from '../../lib/random';
import { useTurnBubble } from '../../lib/turn';
import { useApp } from '../../state/AppState';
import type { Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { addSips, fromReader } from './logic';

/** A choice on the setup screen: who the cards are about. `mixed` picks one of the others per card. */
export interface Mode {
  id: string;
  emoji: string;
  /** Already translated. */
  label: string;
  mixed?: boolean;
}

/** One card on the table: its text, who it's about (a mode's id), and who reads it out. */
export interface Round {
  text: string;
  who: string;
  reader: number;
}

export interface VoteGameProps<V> extends GameProps {
  game: string;
  cards: readonly string[];
  modes: Mode[];
  /** The setup screen's question, e.g. "Who's it about?". Already translated. */
  modeTitle: string;
  /** How it works, in a line (shown until the group knows the game). Already translated. */
  intro: string;
  /** The card, big (on its own) or small (over the ballot). */
  Card: (p: { round: Round; small?: boolean }) => ReactNode;
  /** The buttons one voter taps (in secret). */
  Ballot: (p: { round: Round; vote: (v: V) => void }) => ReactNode;
  /** Who drinks how much, per player id. */
  judge: (votes: Record<string, V>, ids: string[]) => Record<string, number>;
  /** What everyone voted and who drinks. */
  Result: (p: { round: Round; votes: Record<string, V>; players: Player[] }) => ReactNode;
}

interface State<V> {
  deck: string[];
  drawn: number;
  mode: string;
  round: Round;
  phase: 'card' | 'vote' | 'reveal' | 'over';
  votes: Record<string, V>;
  /** Sips per player id, all game. */
  tally: Record<string, number>;
  /** Cards voted on so far. */
  rounds: number;
}

/**
 * The two voting games: a card goes on the table, the phone goes round and everyone taps a vote in
 * secret, then it shows what everyone voted and who drinks. Next card, next reader.
 */
export default function VoteGame<V>(props: VoteGameProps<V>) {
  const { game, players, exit, cards, modes, Card, Ballot, Result, judge } = props;
  const known = useApp().knows(game);
  const [mode, setMode] = useState(modes[modes.length - 1].id);
  const [s, setS] = useState<State<V> | null>(null);

  const order = s ? fromReader(players, s.round.reader) : [];
  const voter = s?.phase === 'vote' ? order[Object.keys(s.votes).length] : undefined;
  const reader = s ? players[s.round.reader % players.length] : undefined;
  useTurnBubble(s?.phase === 'vote' ? voter : s?.phase === 'card' ? reader : null);

  /** Who a card is about: the mode picked, or one of the others at random for a mixed one. */
  const whoFor = (id: string) => (modes.find((m) => m.id === id)?.mixed ? pick(modes.filter((m) => !m.mixed)).id : id);

  const start = (modeId: string) => {
    const deck = shuffle(cards);
    setS({ deck, drawn: 1, mode: modeId, round: { text: deck[0], who: whoFor(modeId), reader: 0 }, phase: 'card', votes: {}, tally: {}, rounds: 0 });
  };

  /* ---------- Before the game: who the cards are about ---------- */
  if (!s) {
    return (
      <div className="bd vt">
        <section className="section">
          <h3 className="section-title">{props.modeTitle}</h3>
          <div className={`seg ${modes.length === 2 ? 'two' : 'three'}`}>
            {modes.map((m) => (
              <button key={m.id} type="button" className={`seg-btn${mode === m.id ? ' active' : ''}`} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                <span className="vt-seg-emoji" aria-hidden="true">
                  {m.emoji}
                </span>
                <span className="seg-sub">{m.label}</span>
              </button>
            ))}
          </div>
        </section>
        {!known && <p className="fine-print">{props.intro}</p>}
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => start(mode)}>
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  const vote = (v: V) => {
    if (!voter) return;
    sfx.tick();
    buzz(12);
    const votes = { ...s.votes, [voter.id]: v };
    if (Object.keys(votes).length < players.length) return setS({ ...s, votes });
    const sips = judge(
      votes,
      players.map((p) => p.id),
    );
    if (Object.keys(sips).length) buzz([30, 30, 60]);
    else celebrate();
    setS({ ...s, votes, phase: 'reveal', tally: addSips(s.tally, sips), rounds: s.rounds + 1 });
  };

  const undo = () => {
    const last = order[Object.keys(s.votes).length - 1];
    if (!last) return setS({ ...s, phase: 'card' });
    const votes = { ...s.votes };
    delete votes[last.id];
    setS({ ...s, votes });
  };

  const next = () => {
    if (s.drawn >= s.deck.length) return setS({ ...s, phase: 'over' });
    setS({
      ...s,
      drawn: s.drawn + 1,
      round: { text: s.deck[s.drawn], who: whoFor(s.mode), reader: (s.round.reader + 1) % players.length },
      phase: 'card',
      votes: {},
    });
  };

  let body: ReactNode;
  if (s.phase === 'over') {
    const ranked = players.map((p) => ({ p, n: s.tally[p.id] ?? 0 })).sort((a, b) => b.n - a.n);
    body = (
      <div className="bd vt">
        <div className="bd-head center">
          <span className="kicker">{t('Game over')}</span>
          <h2 className="bd-title big">{s.drawn >= s.deck.length ? t('All cards played!') : t('That’s it!')}</h2>
        </div>
        <section className="panel">
          <h3 className="section-title">{t('Who drank what')}</h3>
          <div className="ftd-tally">
            {ranked.map(({ p, n }) => (
              <div key={p.id} className="ftd-tally-row">
                <span className="bd-avatar xs" style={{ background: p.color }}>
                  <Avatar avatar={p.avatar} photo={p.photo} />
                </span>
                <span className="ftd-tally-name">{p.name}</span>
                <span className="ftd-tally-num">{n === 1 ? t('{n} sip', { n }) : t('{n} sips', { n })}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="sticky-action stack">
          <BigButton onClick={() => start(s.mode)}>{t('Play again')}</BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  } else if (s.phase === 'card' && reader) {
    body = (
      <div className="vt fill">
        <div className="kc-status vt-status">
          <div className="bd-player">
            <span className="bd-avatar" style={{ background: reader.color }}>
              <Avatar avatar={reader.avatar} photo={reader.photo} />
            </span>
            <span className="bd-player-text">
              <span className="bd-player-name">{reader.name}</span>
              <span className="bd-player-sub">{t('reads it out')}</span>
            </span>
          </div>
          <span className="vt-count">{t('{n} of {total}', { n: s.drawn, total: s.deck.length })}</span>
        </div>
        <div className="vt-stage">
          <div key={s.drawn} className="vt-card-in">
            <Card round={s.round} />
          </div>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setS({ ...s, phase: 'vote' })}>
            {t('Vote')}
          </BigButton>
          {!known && <p className="fine-print center vt-under">{t('Pass the phone round. Everyone votes in secret.')}</p>}
        </div>
      </div>
    );
  } else if (s.phase === 'vote' && voter) {
    const n = Object.keys(s.votes).length;
    body = (
      <div className="vt fill">
        {/* A new face for every voter, so nobody sees the one before. */}
        <div key={voter.id} className="vt-voter" style={{ '--chip': voter.color } as CSSProperties}>
          <span className="vt-voter-avatar">
            <Avatar avatar={voter.avatar} photo={voter.photo} />
          </span>
          <span className="vt-voter-name">{voter.name}</span>
          <span className="vt-voter-sub">{t('Secret vote · {n} of {total}', { n: n + 1, total: players.length })}</span>
        </div>
        <div className="vt-stage small">
          <Card round={s.round} small />
        </div>
        <div className="vt-ballot">
          <Ballot round={s.round} vote={vote} />
        </div>
        <button type="button" className="text-btn vt-undo" onClick={undo}>
          {n ? t('← Back to {name}', { name: order[n - 1].name }) : t('← Back to the card')}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="vt fill">
        <div className="vt-stage small">
          <Card round={s.round} small />
        </div>
        <Result round={s.round} votes={s.votes} players={players} />
        <div className="sticky-action stack">
          <BigButton size="xl" variant="light" onClick={next}>
            {s.drawn >= s.deck.length ? t('Finish game') : <NextName text={t('Next card: {name} reads →')} name={players[(s.round.reader + 1) % players.length].name} />}
          </BigButton>
          {s.drawn < s.deck.length && (
            <button type="button" className="text-btn" onClick={() => setS({ ...s, phase: 'over' })}>
              {t('End game')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cards go on and on: the game counts from its first vote on. */}
      {s.rounds > 0 && <Finished game={game} />}
      {body}
    </>
  );
}

/** The players on one side of a vote, as small chips. */
export function Voters({ list, drink }: { list: Player[]; drink?: boolean }) {
  if (!list.length) return <span className="vt-nobody">{t('Nobody')}</span>;
  return (
    <span className="vt-voters">
      {list.map((p) => (
        <span key={p.id} className={`vt-voter-chip${drink ? ' drinks' : ''}`} style={{ '--chip': p.color } as CSSProperties}>
          <span className="vt-voter-chip-avatar">
            <Avatar avatar={p.avatar} photo={p.photo} />
          </span>
          <span className="vt-voter-chip-name">{p.name}</span>
        </span>
      ))}
    </span>
  );
}

/** The verdict under a reveal: who drinks, or that nobody does. */
export function Verdict({ tone, emoji, title, sub }: { tone: 'good' | 'bad' | 'same'; emoji: string; title: string; sub?: string }) {
  return (
    <div className={`bd-result vt-verdict ${tone === 'good' ? 'correct' : tone === 'bad' ? 'wrong' : 'same'}`}>
      <span className="bd-result-emoji">{emoji}</span>
      <span className="bd-result-text">
        <span className="bd-result-title">{title}</span>
        {sub && <span className="bd-result-sub">{sub}</span>}
      </span>
    </div>
  );
}

/** Names joined for a sentence: "Lena", "Lena and Jo", "Lena, Jo and Sam". */
export function names(list: Player[]) {
  const n = list.map((p) => p.name);
  return n.length <= 1 ? (n[0] ?? '') : t('{names} and {last}', { names: n.slice(0, -1).join(', '), last: n[n.length - 1] });
}
