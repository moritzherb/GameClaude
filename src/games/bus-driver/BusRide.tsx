import { useRef, useState } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import { cardName, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import type { Player } from '../../state/AppState';
import Answers, { Verdict } from './Answers';
import { QUESTIONS, type Guess, type Result } from './logic';
import { answerRide, startRide, type RideState } from './ride';

interface Props {
  driver: Player;
  /** Start part 1 again with everyone. */
  onPlayAgain: () => void;
  onExit: () => void;
}

interface Reveal {
  card: Card;
  result: Result;
  shown: Card[];
  reshuffled: boolean;
  /** Flip number of this card, keeps the flip animation on the same card. */
  index: number;
}

export default function BusRide({ driver, onPlayAgain, onExit }: Props) {
  const [ride, setRide] = useState<RideState | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [finished, setFinished] = useState(false);
  const answered = useRef(false);

  // The ride always uses all five questions, including "Which suit?".
  const questions = QUESTIONS;

  /* ---------- Intro ---------- */
  if (!ride) {
    return (
      <div className="bd">
        <div className="driver-hero pop-in">
          <span className="driver-bus">🚌</span>
          <span className="bd-avatar xl" style={{ background: driver.color }}>
            {driver.avatar}
          </span>
        </div>
        <div className="bd-head center">
          <span className="kicker">Part 3 · The bus ride</span>
          <h2 className="bd-title big">{driver.name} drives the bus</h2>
          <p className="lead">
            Fresh deck, all five questions from part 1 in a row. Get one wrong: drink the question number in sips and start again from question 1. The ride
            ends when every question is right in one go.
          </p>
        </div>

        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setRide(startRide())}>
            Start the ride 🚌
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------- Made it ---------- */
  if (finished) {
    const fails = ride.attempt - 1;
    return (
      <div className="bd driver">
        <div className="driver-hero pop-in">
          <span className="driver-bus">🏁</span>
          <span className="bd-avatar xl" style={{ background: driver.color }}>
            {driver.avatar}
          </span>
        </div>
        <div className="bd-head center">
          <span className="kicker">Ride complete</span>
          <h2 className="bd-title big">{driver.name} made it!</h2>
          <p className="lead">
            {fails === 0 ? 'First try. Legend.' : `${fails} restart${fails > 1 ? 's' : ''} and ${ride.drunk} sips later.`}
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Attempts</span>
            <span className="stat-value">{ride.attempt}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Sips drunk</span>
            <span className="stat-value">{ride.drunk}</span>
          </div>
          <div className="stat wide">
            <span className="stat-label">Cards flipped</span>
            <span className="stat-value">{ride.drawn}</span>
          </div>
        </div>
        <div className="sticky-action stack">
          <BigButton onClick={onPlayAgain}>Play again</BigButton>
          <BigButton variant="glass" onClick={onExit}>
            Back to games
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------- Riding ---------- */
  const answer = (guess: Guess) => {
    if (reveal || answered.current) return;
    answered.current = true;
    const step = answerRide(ride, guess, questions.length);
    setReveal({ card: step.card, result: step.result, shown: step.shown, reshuffled: step.reshuffled, index: ride.drawn });
    setRide(step.state);
    window.setTimeout(() => {
      if (step.state.done) celebrate();
      else if (step.result.outcome === 'correct') {
        sfx.pop();
        buzz(20);
      } else {
        sfx.boo();
        buzz(step.result.outcome === 'same' ? [80, 60, 80, 60, 200] : [60, 40, 120]);
      }
    }, 450);
  };

  const next = () => {
    answered.current = false;
    if (ride.done) setFinished(true);
    setReveal(null);
  };

  // Which question is on screen: the one just answered, or the next one.
  const q = reveal ? reveal.shown.length - 1 : ride.streak.length;
  const question = questions[q];
  const held = reveal ? reveal.shown.slice(0, -1) : ride.streak;
  const failed = reveal && reveal.result.outcome !== 'correct';

  let verdict = null;
  let nextLabel = '';
  if (reveal) {
    const detail = `It was ${cardName(reveal.card)}${reveal.reshuffled ? ' · new deck shuffled' : ''}`;
    if (ride.done) {
      verdict = <Verdict tone="correct" emoji="🏁" title="All correct!" sub="The bus has arrived." detail={detail} />;
      nextLabel = 'Finish the ride';
    } else if (!failed) {
      verdict = <Verdict tone="correct" emoji="✅" title="Correct!" sub={`Next: ${questions[q + 1].title}`} detail={detail} />;
      nextLabel = 'Next question →';
    } else {
      const { sips, outcome } = reveal.result;
      verdict = (
        <Verdict
          tone={outcome}
          emoji={outcome === 'same' ? '😱' : '🍺'}
          title={outcome === 'same' ? `Same value! Drink ${sips}` : `Wrong! Drink ${sips}`}
          sub="Back to question 1."
          detail={detail}
        />
      );
      nextLabel = 'Start over 🔁';
    }
  }

  return (
    <div className="bd">
      <div className="bd-progress" aria-label={`Question ${q + 1} of ${questions.length}`}>
        {questions.map((x, i) => (
          <span key={x.id} className={i < q ? 'done' : i === q ? (reveal ? (failed ? 'fail' : 'done') : 'now') : ''} />
        ))}
      </div>

      <div className="bd-player">
        <span className="bd-avatar" style={{ background: driver.color }}>
          {driver.avatar}
        </span>
        <span className="bd-player-text">
          <span className="bd-player-name">{driver.name}</span>
          <span className="bd-player-sub">
            🚌 Attempt {ride.attempt - (failed ? 1 : 0)} · 🍺 {ride.drunk} sips
          </span>
        </span>
      </div>

      <div className="bd-hand">
        {held.map((c, i) => (
          <PlayingCard key={i} card={c} />
        ))}
        <PlayingCard key={`slot-${reveal ? reveal.index : ride.drawn}`} card={reveal?.card} faceUp={!!reveal} waiting={!reveal} />
      </div>

      <h2 className="bd-question">
        <span className="bd-question-num">
          {q + 1}/{questions.length}
        </span>{' '}
        {question.title}
      </h2>

      {reveal ? verdict : <Answers questionId={question.id} onAnswer={answer} />}

      {reveal && (
        <div className="sticky-action">
          <BigButton size="xl" variant={failed ? 'primary' : 'light'} onClick={next}>
            {nextLabel}
          </BigButton>
        </div>
      )}
    </div>
  );
}
