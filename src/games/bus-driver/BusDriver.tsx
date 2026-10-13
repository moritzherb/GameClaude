import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import NextName from '../../components/NextName';
import PlayingCard from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { newDeck, type Card } from '../../lib/cards';
import { buzz, cheer, sfx } from '../../lib/fx';
import { pick, shuffle } from '../../lib/random';
import { useApp, type Player } from '../../state/AppState';
import type { GameProps } from '../types';
import Answers, { Verdict, VERDICT_DELAY_MS } from './Answers';
import BusRide from './BusRide';
import CardRow from './CardRow';
import { judge, questionsFor, type Guess, type Result } from './logic';
import Pyramid from './Pyramid';
import Tiebreak from './Tiebreak';
import Avatar from '../../components/Avatar';

interface Seat {
  player: Player;
  hand: Card[];
  drank: number;
  gave: number;
}

interface State {
  stage: 'setup' | 'intro' | 'turn' | 'done' | 'pyramid' | 'tiebreak' | 'driver';
  risky: boolean;
  dealerId: string;
  /** Turn order: starts left of the dealer, dealer goes last. */
  seats: Seat[];
  deck: Card[];
  round: number;
  turn: number;
  reveal: { card: Card; result: Result } | null;
  /** Players tied for most cards after the pyramid. */
  tied: Player[];
  driver: Player | null;
}

function seatOrder(players: Player[], dealerId: string): Seat[] {
  const i = Math.max(0, players.findIndex((p) => p.id === dealerId));
  return [...players.slice(i + 1), ...players.slice(0, i + 1)].map((player) => ({ player, hand: [], drank: 0, gave: 0 }));
}

export default function BusDriver({ players, exit }: GameProps) {
  // Groups who know the game skip the explanations and the round intros.
  const known = useApp().knows('bus-driver');
  const roundStart = known ? 'turn' : 'intro';
  const [s, setS] = useState<State>(() => ({
    stage: 'setup',
    risky: false,
    dealerId: pick(players).id,
    seats: [],
    deck: [],
    round: 0,
    turn: 0,
    reveal: null,
    tied: [],
    driver: null,
  }));
  const timer = useRef<number>(undefined);
  // Blocks a double tap from answering twice before React re-renders.
  const answered = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (s.stage === 'driver') cheer();
  }, [s.stage]);

  // Without the round intros (game known), a short card still flags each new question.
  const [flash, setFlash] = useState<number | null>(null);
  useEffect(() => {
    if (!known || s.stage !== 'turn') return;
    setFlash(s.round);
    const id = window.setTimeout(() => setFlash(null), 1700);
    return () => window.clearTimeout(id);
  }, [known, s.stage, s.round]);

  const questions = questionsFor(s.risky);
  const question = questions[s.round];
  const seat = s.seats[s.turn];
  const dealer = players.find((p) => p.id === s.dealerId);

  const start = () =>
    setS({ ...s, stage: roundStart, seats: seatOrder(players, s.dealerId), deck: shuffle(newDeck()), round: 0, turn: 0, reveal: null });

  const answer = (guess: Guess) => {
    if (s.reveal || answered.current) return;
    answered.current = true;
    // Deck empty (lots of players)? Open a fresh one.
    const fresh = s.deck.length === 0;
    const [card, ...deck] = fresh ? shuffle(newDeck()) : s.deck;
    const result = judge(s.round, seat.hand, guess, card);
    const seats = s.seats.map((x, i) =>
      i === s.turn
        ? {
            ...x,
            hand: [...x.hand, card],
            drank: x.drank + (result.outcome === 'correct' ? 0 : result.sips),
            gave: x.gave + (result.outcome === 'correct' ? result.sips : 0),
          }
        : x,
    );
    setS({ ...s, seats, deck, reveal: { card, result } });

    // Let the card flip before the verdict lands.
    timer.current = window.setTimeout(() => {
      if (result.outcome === 'correct') cheer();
      else {
        sfx.boo();
        buzz(result.outcome === 'same' ? [80, 60, 80, 60, 200] : [60, 40, 120]);
      }
    }, VERDICT_DELAY_MS);
  };

  const next = () => {
    answered.current = false;
    const lastTurn = s.turn + 1 >= s.seats.length;
    if (!lastTurn) return setS({ ...s, turn: s.turn + 1, reveal: null });
    const lastRound = s.round + 1 >= questions.length;
    setS({ ...s, stage: lastRound ? 'done' : roundStart, round: lastRound ? s.round : s.round + 1, turn: 0, reveal: null });
  };

  /* ---------- Setup: pick the dealer, risky mode ---------- */
  if (s.stage === 'setup') {
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('Part 1 · Collect your cards')}</span>
          <h2 className="bd-title">{t('Who’s dealing?')}</h2>
          {!known && <p className="lead">{t('Play starts left of the dealer. The dealer plays too and goes last.')}</p>}
        </div>

        <div className="pick-grid">
          {players.map((p) => (
            <Tap
              key={p.id}
              className={`pick-chip${p.id === s.dealerId ? ' selected' : ''}`}
              style={{ '--chip': p.color } as CSSProperties}
              onClick={() => setS({ ...s, dealerId: p.id })}
            >
              <span className="pick-chip-avatar"><Avatar avatar={p.avatar} photo={p.photo} /></span>
              <span className="pick-chip-name">{p.name}</span>
              {p.id === s.dealerId && <span className="pick-chip-badge">{t('Dealer')}</span>}
            </Tap>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={() => setS({ ...s, dealerId: pick(players).id })}>
          {t('Pick a random dealer')}
        </button>

        <div className="settings-list">
          <button
            type="button"
            role="switch"
            aria-checked={s.risky}
            className={`setting-row${s.risky ? ' on' : ''}`}
            onClick={() => {
              sfx.pop();
              buzz();
              setS({ ...s, risky: !s.risky });
            }}
          >
            <span className="setting-emoji">🔥</span>
            <span className="setting-text">
              <span className="setting-label">{t('Risky mode')}</span>
              <span className="setting-hint">{t('Adds a 5th question: guess the exact suit.')}</span>
            </span>
            <span className="switch">
              <span className="switch-knob" />
            </span>
          </button>
        </div>

        <div className="sticky-action">
          <BigButton size="xl" onClick={start}>
            {t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------- Done: everyone has their cards ---------- */
  if (s.stage === 'done') {
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('Part 1 done')}</span>
          <h2 className="bd-title">{t('Everyone’s got their cards.')}</h2>
        </div>

        <div className="bd-summary">
          {s.seats.map((x) => (
            <div key={x.player.id} className="bd-summary-row">
              <div className="bd-summary-who">
                <span className="bd-avatar sm" style={{ background: x.player.color }}>
                  <Avatar avatar={x.player.avatar} photo={x.player.photo} />
                </span>
                <span className="bd-summary-name">{x.player.name}</span>
                <span className="bd-summary-stats">
                  {t('drank {drank} · gave {gave}', { drank: x.drank, gave: x.gave })}
                </span>
              </div>
              <div className="bd-summary-hand">
                {x.hand.map((c, i) => (
                  <PlayingCard key={i} card={c} size="sm" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setS({ ...s, stage: 'pyramid' })}>
            {t('Part 2: The pyramid')}
          </BigButton>
        </div>
      </div>
    );
  }

  const restart = () => setS({ ...s, stage: 'setup', seats: [], round: 0, turn: 0, reveal: null, tied: [], driver: null });

  /* ---------- Part 2: pyramid and tiebreaker, part 3: the bus ride ---------- */
  if (s.stage === 'pyramid') {
    return (
      <Pyramid
        seats={s.seats}
        deck={s.deck}
        onDone={(losers) =>
          setS(losers.length === 1 ? { ...s, stage: 'driver', driver: losers[0] } : { ...s, stage: 'tiebreak', tied: losers })
        }
      />
    );
  }

  if (s.stage === 'tiebreak') {
    return <Tiebreak tied={s.tied} onDone={(driver) => setS({ ...s, stage: 'driver', driver })} />;
  }

  if (s.stage === 'driver' && s.driver) {
    return <BusRide driver={s.driver} onPlayAgain={restart} onExit={exit} />;
  }

  const progress = (
    <div className="bd-progress" aria-label={t('Round {n} of {total}', { n: s.round + 1, total: questions.length })}>
      {questions.map((q, i) => (
        <span key={q.id} className={i < s.round ? 'done' : i === s.round ? 'now' : ''} />
      ))}
    </div>
  );

  /* ---------- Round intro ---------- */
  if (s.stage === 'intro') {
    const sips = s.round + 1;
    const hasSame = question.id === 'higher-lower' || question.id === 'inside-outside';
    const first = s.seats[0].player;
    return (
      <div className="bd">
        {progress}
        <div className="bd-intro fade-up">
          <span className="kicker">
            {t('Round {n} of {total}', { n: s.round + 1, total: questions.length })}
          </span>
          <h2 className="bd-title big">{t(question.title)}</h2>
          <p className="lead">{t(question.explain)}</p>
          <div className="bd-rules">
            <span className="bd-rule good">{t('Right → give out {n}', { n: sips })}</span>
            <span className="bd-rule bad">{t('Wrong → drink {n}', { n: sips })}</span>
            {hasSame && <span className="bd-rule bad">{t('Same value → drink {n}', { n: sips * 2 })}</span>}
          </div>
        </div>
        <div className="bd-first">
          <span className="bd-avatar sm" style={{ background: first.color }}>
            <Avatar avatar={first.avatar} photo={first.photo} />
          </span>
          <span>
            <strong>{first.name}</strong> {t('starts')}
            {dealer ? ` · ${t('{name} deals', { name: dealer.name })}` : ''}
          </span>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setS({ ...s, stage: 'turn' })}>
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------- A player's turn ---------- */
  const { reveal } = s;
  const isDealer = seat.player.id === s.dealerId;
  const nextLabel =
    s.turn + 1 < s.seats.length
      ? <NextName text={t('Next: {name}')} name={s.seats[s.turn + 1].player.name} />
      : s.round + 1 < questions.length
        ? t('Next round')
        : t('Show everyone’s cards');
  // The hand already contains the revealed card once answered; show it in the flip slot instead.
  const held = reveal ? seat.hand.slice(0, -1) : seat.hand;

  return (
    <div className="bd bd-turn fill">
      {progress}

      {flash !== null && (
        <button key={flash} type="button" className="bd-flash" onClick={() => setFlash(null)}>
          <span className="bd-flash-card">
            <span className="kicker">{t('Round {n} of {total}', { n: s.round + 1, total: questions.length })}</span>
            <span className="bd-flash-title">{t(question.title)}</span>
          </span>
        </button>
      )}

      <div className="bd-player">
        <span className="bd-avatar" style={{ background: seat.player.color }}>
          <Avatar avatar={seat.player.avatar} photo={seat.player.photo} />
        </span>
        <span className="bd-player-text">
          <span className="bd-player-name">{seat.player.name}</span>
          <span className="bd-player-sub">
            {isDealer ? `${t('Dealer')} · ` : ''}
            {t('{n} of {total}', { n: s.turn + 1, total: s.seats.length })}
          </span>
        </span>
      </div>

      <CardRow count={held.length + 1}>
        {held.map((c, i) => (
          <PlayingCard key={i} card={c} />
        ))}
        <PlayingCard key={`slot-${s.round}-${s.turn}`} card={reveal?.card} faceUp={!!reveal} waiting={!reveal} />
      </CardRow>

      <h2 className="bd-question">{t(question.title)}</h2>

      {/* Answers, or the verdict and "next": one room of the same height, so the cards never move. */}
      <div className="bd-foot">
        {reveal ? (
          <>
            <ResultBanner result={reveal.result} />
            <BigButton size="xl" variant="light" onClick={next}>
              {nextLabel} →
            </BigButton>
          </>
        ) : (
          <Answers questionId={question.id} onAnswer={answer} />
        )}
      </div>
    </div>
  );
}

function ResultBanner({ result }: { result: Result }) {
  const n = result.sips;
  const one = n === 1;
  const copy = {
    correct: { emoji: '🎉', title: t('Correct!'), sub: one ? t('Give out {n} sip', { n }) : t('Give out {n} sips', { n }) },
    wrong: { emoji: '🍺', title: t('Wrong!'), sub: one ? t('Drink {n} sip', { n }) : t('Drink {n} sips', { n }) },
    same: { emoji: '😱', title: t('Same value!'), sub: t('Double trouble: drink {n} sips', { n }) },
  }[result.outcome];
  return <Verdict tone={result.outcome} {...copy} />;
}
