import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import Tap from '../../components/Tap';
import { cardName, newDeck, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick, shuffle } from '../../lib/random';
import type { Player } from '../../state/AppState';
import type { GameProps } from '../types';
import Answers, { Verdict } from './Answers';
import BusRide from './BusRide';
import { judge, questionsFor, type Guess, type Result } from './logic';
import Pyramid from './Pyramid';
import Tiebreak from './Tiebreak';

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
  /** True right after the deck ran out and a fresh one was opened. */
  newDeckOpened: boolean;
  /** Players tied for most cards after the pyramid. */
  tied: Player[];
  driver: Player | null;
}

const REVEAL_MS = 550;

function seatOrder(players: Player[], dealerId: string): Seat[] {
  const i = Math.max(0, players.findIndex((p) => p.id === dealerId));
  return [...players.slice(i + 1), ...players.slice(0, i + 1)].map((player) => ({ player, hand: [], drank: 0, gave: 0 }));
}


export default function BusDriver({ players, exit }: GameProps) {
  const [s, setS] = useState<State>(() => ({
    stage: 'setup',
    risky: false,
    dealerId: pick(players).id,
    seats: [],
    deck: [],
    round: 0,
    turn: 0,
    reveal: null,
    newDeckOpened: false,
    tied: [],
    driver: null,
  }));
  const timer = useRef<number>(undefined);
  // Blocks a double tap from answering twice before React re-renders.
  const answered = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (s.stage === 'driver') celebrate();
  }, [s.stage]);

  const questions = questionsFor(s.risky);
  const question = questions[s.round];
  const seat = s.seats[s.turn];
  const dealer = players.find((p) => p.id === s.dealerId);

  const start = () =>
    setS({ ...s, stage: 'intro', seats: seatOrder(players, s.dealerId), deck: shuffle(newDeck()), round: 0, turn: 0, reveal: null });

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
    setS({ ...s, seats, deck, reveal: { card, result }, newDeckOpened: fresh });

    // Let the card flip before the verdict lands.
    timer.current = window.setTimeout(() => {
      if (result.outcome === 'correct') celebrate();
      else {
        sfx.boo();
        buzz(result.outcome === 'same' ? [80, 60, 80, 60, 200] : [60, 40, 120]);
      }
    }, REVEAL_MS);
  };

  const next = () => {
    answered.current = false;
    const lastTurn = s.turn + 1 >= s.seats.length;
    if (!lastTurn) return setS({ ...s, turn: s.turn + 1, reveal: null, newDeckOpened: false });
    const lastRound = s.round + 1 >= questions.length;
    setS({ ...s, stage: lastRound ? 'done' : 'intro', round: lastRound ? s.round : s.round + 1, turn: 0, reveal: null, newDeckOpened: false });
  };

  /* ---------- Setup: pick the dealer, risky mode ---------- */
  if (s.stage === 'setup') {
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">Part 1 · Collect your cards</span>
          <h2 className="bd-title">Who’s dealing?</h2>
          <p className="lead">Play starts left of the dealer. The dealer plays too and goes last.</p>
        </div>

        <div className="pick-grid">
          {players.map((p) => (
            <Tap
              key={p.id}
              className={`pick-chip${p.id === s.dealerId ? ' selected' : ''}`}
              style={{ '--chip': p.color } as CSSProperties}
              onClick={() => setS({ ...s, dealerId: p.id })}
            >
              <span className="pick-chip-avatar">{p.avatar}</span>
              <span className="pick-chip-name">{p.name}</span>
              {p.id === s.dealerId && <span className="pick-chip-badge">Dealer</span>}
            </Tap>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={() => setS({ ...s, dealerId: pick(players).id })}>
          🎲 Pick a random dealer
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
              <span className="setting-label">Risky mode</span>
              <span className="setting-hint">Adds a 5th question: guess the exact suit.</span>
            </span>
            <span className="switch">
              <span className="switch-knob" />
            </span>
          </button>
        </div>

        <div className="sticky-action">
          <BigButton size="xl" onClick={start}>
            Deal the cards 🃏
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
          <span className="kicker">Part 1 done</span>
          <h2 className="bd-title">Everyone’s got their cards.</h2>
        </div>

        <div className="bd-summary">
          {s.seats.map((x) => (
            <div key={x.player.id} className="bd-summary-row">
              <div className="bd-summary-who">
                <span className="bd-avatar sm" style={{ background: x.player.color }}>
                  {x.player.avatar}
                </span>
                <span className="bd-summary-name">{x.player.name}</span>
                <span className="bd-summary-stats">
                  🍺 {x.drank} · 🎁 {x.gave}
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
            Part 2: The pyramid 🔺
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
    <div className="bd-progress" aria-label={`Round ${s.round + 1} of ${questions.length}`}>
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
            Round {s.round + 1} of {questions.length}
          </span>
          <h2 className="bd-title big">{question.title}</h2>
          <p className="lead">{question.explain}</p>
          <div className="bd-rules">
            <span className="bd-rule good">✅ Right → give out {sips}</span>
            <span className="bd-rule bad">❌ Wrong → drink {sips}</span>
            {hasSame && <span className="bd-rule bad">🟰 Same value → drink {sips * 2}</span>}
          </div>
        </div>
        <div className="bd-first">
          <span className="bd-avatar sm" style={{ background: first.color }}>
            {first.avatar}
          </span>
          <span>
            <strong>{first.name}</strong> starts{dealer ? ` · ${dealer.name} deals` : ''}
          </span>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setS({ ...s, stage: 'turn' })}>
            Let’s go
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
      ? `Next: ${s.seats[s.turn + 1].player.name}`
      : s.round + 1 < questions.length
        ? 'Next round'
        : 'Show everyone’s cards';
  // The hand already contains the revealed card once answered; show it in the flip slot instead.
  const held = reveal ? seat.hand.slice(0, -1) : seat.hand;

  return (
    <div className="bd">
      {progress}

      <div className="bd-player">
        <span className="bd-avatar" style={{ background: seat.player.color }}>
          {seat.player.avatar}
        </span>
        <span className="bd-player-text">
          <span className="bd-player-name">{seat.player.name}</span>
          <span className="bd-player-sub">
            {isDealer ? 'Dealer · ' : ''}
            {s.turn + 1} of {s.seats.length}
          </span>
        </span>
      </div>

      <div className="bd-hand">
        {held.map((c, i) => (
          <PlayingCard key={i} card={c} />
        ))}
        <PlayingCard key={`slot-${s.round}-${s.turn}`} card={reveal?.card} faceUp={!!reveal} waiting={!reveal} />
      </div>

      <h2 className="bd-question">{question.title}</h2>

      {reveal ? (
        <ResultBanner result={reveal.result} card={reveal.card} newDeck={s.newDeckOpened} />
      ) : (
        <Answers questionId={question.id} onAnswer={answer} />
      )}

      {reveal && (
        <div className="sticky-action">
          <BigButton size="xl" variant="light" onClick={next}>
            {nextLabel} →
          </BigButton>
        </div>
      )}
    </div>
  );
}

function ResultBanner({ result, card, newDeck }: { result: Result; card: Card; newDeck: boolean }) {
  const s = result.sips > 1 ? 's' : '';
  const copy = {
    correct: { emoji: '🎉', title: 'Correct!', sub: `Give out ${result.sips} sip${s}` },
    wrong: { emoji: '🍺', title: 'Wrong!', sub: `Drink ${result.sips} sip${s}` },
    same: { emoji: '😱', title: 'Same value!', sub: `Double trouble: drink ${result.sips} sips` },
  }[result.outcome];
  return <Verdict tone={result.outcome} {...copy} detail={`It was ${cardName(card)}${newDeck ? ' · fresh deck opened' : ''}`} />;
}
