import { useRef, useState } from 'react';
import BigButton from '../../components/BigButton';
import DeckCount from '../../components/DeckCount';
import PlayingCard from '../../components/PlayingCard';
import { t } from '../../i18n';
import { cardName, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import type { Player } from '../../state/AppState';
import Answers, { Verdict } from './Answers';
import type { RideStats } from './RideFinish';
import { QUESTIONS, type Guess, type Result } from './logic';
import { answerRide, startRide, type RideState } from './ride';


interface Reveal {
  card: Card;
  result: Result;
  shown: Card[];
  reshuffled: boolean;
  /** Flip number of this card, keeps the flip animation on the same card. */
  index: number;
}

export default function ClassicRide({ driver, onFinish }: { driver: Player; onFinish: (stats: RideStats) => void }) {
  const [ride, setRide] = useState<RideState>(() => startRide());
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const answered = useRef(false);

  // The classic ride always uses all five questions, including "Which suit?".
  const questions = QUESTIONS;

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
    if (ride.done) onFinish({ attempt: ride.attempt, drunk: ride.drunk, drawn: ride.drawn });
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
    const card = cardName(reveal.card);
    const detail = reveal.reshuffled ? t('It was {card} · new deck shuffled', { card }) : t('It was {card}', { card });
    if (ride.done) {
      verdict = <Verdict tone="correct" emoji="🏁" title={t('All correct!')} sub={t('The bus has arrived.')} detail={detail} />;
      nextLabel = t('Finish the ride');
    } else if (!failed) {
      verdict = (
        <Verdict tone="correct" emoji="✅" title={t('Correct!')} sub={t('Next: {question}', { question: t(questions[q + 1].title) })} detail={detail} />
      );
      nextLabel = t('Next question →');
    } else {
      const { sips, outcome } = reveal.result;
      verdict = (
        <Verdict
          tone={outcome}
          emoji={outcome === 'same' ? '😱' : '🍺'}
          title={outcome === 'same' ? t('Same value! Drink {n}', { n: sips }) : t('Wrong! Drink {n}', { n: sips })}
          sub={t('Back to question 1.')}
          detail={detail}
        />
      );
      nextLabel = t('Start over');
    }
  }

  return (
    <div className="bd">
      <div className="bd-progress" aria-label={t('Question {n} of {total}', { n: q + 1, total: questions.length })}>
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
            {t('Attempt {n} · {sips} sips', { n: ride.attempt - (failed ? 1 : 0), sips: ride.drunk })}
          </span>
        </span>
        <DeckCount left={ride.deck.length} />
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
        {t(question.title)}
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
