import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import DeckCount from '../../components/DeckCount';
import PlayingCard from '../../components/PlayingCard';
import { t, tx } from '../../i18n';
import { cardName, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { useApp, type Player } from '../../state/AppState';
import Answers, { Verdict } from './Answers';
import { allowedSlots, answerBoard, BOARD_QUESTIONS, BOARD_ROWS, startBoard, type BoardMode, type BoardState, type BoardStep } from './board';
import type { Guess } from './logic';
import type { RideStats } from './RideFinish';

const TITLES = { color: tx('Red or black?'), 'higher-lower': tx('Higher or lower?') } as const;

/** Bus ride on a Diamond (1-2-3-2-1) or Zigzag (1-2-1-2-1) board, driven bottom to top. */
export default function BoardRide({ driver, mode, onFinish }: { driver: Player; mode: BoardMode; onFinish: (stats: RideStats) => void }) {
  const known = useApp().knows('bus-driver');
  const [board, setBoard] = useState<BoardState>(() => startBoard(mode));
  const [pick, setPick] = useState<number | null>(null);
  const [step, setStep] = useState<BoardStep | null>(null);
  const answered = useRef(false);
  const verdictRef = useRef<HTMLDivElement>(null);

  const rows = BOARD_ROWS[mode];
  const questions = BOARD_QUESTIONS[mode];
  // While a result is shown, draw the board as it was with that card turned.
  const view = step ? step.shown : { cards: board.cards, up: board.up, path: board.path };
  const row = step ? step.shown.path.length - 1 : board.path.length;
  const allowed = step ? [] : allowedSlots(board);
  const choosing = !step && allowed.length > 1;
  const slot = step ? view.path[row] : allowed.length === 1 ? allowed[0] : pick;
  const prev = row > 0 ? view.cards[row - 1][view.path[row - 1]] : null;
  const failed = !!step && step.outcome !== 'correct';

  // A new row with a single card: nothing to pick.
  useEffect(() => setPick(null), [board.path.length, board.attempt]);

  // Bring the result into view once the card has flipped (the board is tall on small phones).
  useEffect(() => {
    if (!step) return;
    const timer = window.setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    return () => window.clearTimeout(timer);
  }, [step]);

  const answer = (guess: Guess) => {
    if (step || answered.current || slot === null) return;
    if (guess.q !== 'color' && guess.q !== 'higher-lower') return;
    const result = answerBoard(board, slot, guess);
    if (!result) return;
    answered.current = true;
    setStep(result);
    setBoard(result.state);
    window.setTimeout(() => {
      if (result.state.done) celebrate();
      else if (result.outcome === 'correct') {
        sfx.pop();
        buzz(20);
      } else {
        sfx.boo();
        buzz(result.outcome === 'same' ? [80, 60, 80, 60, 200] : [60, 40, 120]);
      }
    }, 450);
  };

  const next = () => {
    answered.current = false;
    if (board.done) onFinish({ attempt: board.attempt, drunk: board.drunk, drawn: board.drawn });
    setStep(null);
  };

  let verdict = null;
  let nextLabel = '';
  if (step) {
    const card = cardName(step.card);
    const detail = step.reshuffled ? t('It was {card} · new deck shuffled', { card }) : t('It was {card}', { card });
    if (board.done) {
      verdict = <Verdict tone="correct" emoji="🏁" title={t('All correct!')} sub={t('The bus has arrived.')} detail={detail} />;
      nextLabel = t('Finish the ride');
    } else if (!failed) {
      verdict = (
        <Verdict tone="correct" emoji="✅" title={t('Correct!')} sub={t('Next row: {question}', { question: t(TITLES[questions[row + 1]]) })} detail={detail} />
      );
      nextLabel = t('Next row →');
    } else {
      verdict = (
        <Verdict
          tone={step.outcome}
          emoji={step.outcome === 'same' ? '😱' : '🍺'}
          title={step.outcome === 'same' ? t('Same value! Drink {n}', { n: step.sips }) : t('Wrong! Drink {n}', { n: step.sips })}
          sub={t('Turned cards get covered. Back to the bottom.')}
          detail={detail}
        />
      );
      nextLabel = t('Start over');
    }
  }

  return (
    <div className="bd">
      <div className="bd-progress" aria-label={t('Row {n} of {total}', { n: row + 1, total: rows.length })}>
        {rows.map((_, i) => (
          <span key={i} className={i < row ? 'done' : i === row ? (step ? (failed ? 'fail' : 'done') : 'now') : ''} />
        ))}
      </div>

      <div className="bd-player">
        <span className="bd-avatar" style={{ background: driver.color }}>
          {driver.avatar}
        </span>
        <span className="bd-player-text">
          <span className="bd-player-name">{driver.name}</span>
          <span className="bd-player-sub">
            {t('Attempt {n} · {sips} sips', { n: board.attempt - (failed ? 1 : 0), sips: board.drunk })}
          </span>
        </span>
        <DeckCount left={board.deck.length} />
      </div>

      <div className="board" style={{ '--cols': Math.max(...rows) } as CSSProperties}>
        {[...rows.keys()].reverse().map((r) => (
          <div key={r} className={`board-row${r === row ? ' current' : ''}`}>
            <span className="board-row-num">{r + 1}</span>
            <div className="board-cards">
              {view.cards[r].map((card, si) => {
                const isUp = view.up[r][si];
                const canPick = r === row && allowed.includes(si);
                const picked = r === row && slot === si;
                const onPath = view.path[r] === si && r < row;
                return (
                  <button
                    key={`${r}-${si}-${cardKey(card)}`}
                    type="button"
                    className={`board-slot${canPick ? ' can-pick' : ''}${picked ? ' picked' : ''}${onPath ? ' on-path' : ''}${r === row && !canPick && !step ? ' blocked' : ''}`}
                    disabled={!choosing || !canPick}
                    onClick={() => {
                      sfx.tick();
                      buzz(10);
                      setPick(si);
                    }}
                    aria-label={isUp ? cardName(card) : canPick ? t('Pick card {n}', { n: si + 1 }) : t('Face-down card')}
                  >
                    <PlayingCard card={card} faceUp={isUp} waiting={picked && !isUp} style={{ '--cw': 'inherit' } as CSSProperties} />
                  </button>
                );
              })}
            </div>
            <span className="board-row-sips">×{r + 1}</span>
          </div>
        ))}
      </div>

      <h2 className="bd-question">
        <span className="bd-question-num">
          {t('Row {n}/{total}', { n: row + 1, total: rows.length })}
          {prev && questions[row] === 'higher-lower' ? ` · ${t('than {card}', { card: cardName(prev) })}` : ''}
        </span>{' '}
        {t(TITLES[questions[row]])}
      </h2>

      {step ? (
        <div ref={verdictRef}>{verdict}</div>
      ) : slot === null ? (
        <p className="notice center">{known ? t('Pick a card in row {n}.', { n: row + 1 }) : t('Pick a card in row {n}: tap the left or the right one.', { n: row + 1 })}</p>
      ) : (
        <Answers questionId={questions[row]} onAnswer={answer} />
      )}

      {step && (
        <div className="sticky-action">
          <BigButton size="xl" variant={failed ? 'primary' : 'light'} onClick={next}>
            {nextLabel}
          </BigButton>
        </div>
      )}
    </div>
  );
}

function cardKey(c: Card) {
  return `${c.value}${c.suit}`;
}
