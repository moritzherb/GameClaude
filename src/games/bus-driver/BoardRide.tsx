import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import BigButton from '../../components/BigButton';
import DeckCount from '../../components/DeckCount';
import PlayingCard from '../../components/PlayingCard';
import { t, tx } from '../../i18n';
import { cardName, type Card } from '../../lib/cards';
import { buzz, cheer, sfx } from '../../lib/fx';
import { useTurnBubble } from '../../lib/turn';
import { useApp, type Player } from '../../state/AppState';
import Answers, { Verdict, VERDICT_DELAY_MS } from './Answers';
import { allowedSlots, answerBoard, BOARD_QUESTIONS, BOARD_ROWS, startBoard, type BoardMode, type BoardState, type BoardStep } from './board';
import type { Guess } from './logic';
import type { RideStats } from './RideFinish';
import { fitCards, useBox } from '../../lib/useBox';
import Avatar from '../../components/Avatar';

const TITLES = { color: tx('Red or black?'), 'higher-lower': tx('Higher or lower?') } as const;

/** Bus ride on a Diamond (1-2-3-2-1) or Zigzag (1-2-1-2-1) board, driven bottom to top. */
export default function BoardRide({ driver, mode, onFinish }: { driver: Player; mode: BoardMode; onFinish: (stats: RideStats) => void }) {
  useTurnBubble(driver);
  const known = useApp().knows('bus-driver');
  const [board, setBoard] = useState<BoardState>(() => startBoard(mode));
  const [pick, setPick] = useState<number | null>(null);
  const [step, setStep] = useState<BoardStep | null>(null);
  const answered = useRef(false);

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

  const answer = (guess: Guess) => {
    if (step || answered.current || slot === null) return;
    if (guess.q !== 'color' && guess.q !== 'higher-lower') return;
    const result = answerBoard(board, slot, guess);
    if (!result) return;
    answered.current = true;
    setStep(result);
    setBoard(result.state);
    window.setTimeout(() => {
      if (result.state.done) cheer();
      else if (result.outcome === 'correct') {
        sfx.pop();
        buzz(20);
      } else {
        sfx.boo();
        buzz(result.outcome === 'same' ? [80, 60, 80, 60, 200] : [60, 40, 120]);
      }
    }, VERDICT_DELAY_MS);
  };

  const next = () => {
    answered.current = false;
    if (board.done) onFinish({ attempt: board.attempt, drunk: board.drunk, drawn: board.drawn });
    setStep(null);
  };

  let verdict = null;
  let nextLabel = '';
  if (step) {
    if (board.done) {
      verdict = <Verdict tone="correct" emoji="🏁" title={t('All correct!')} sub={t('The bus has arrived.')} />;
      nextLabel = t('Finish the ride');
    } else if (!failed) {
      verdict = (
        <Verdict tone="correct" emoji="✅" title={t('Correct!')} sub={t('Next row: {question}', { question: t(TITLES[questions[row + 1]]) })} />
      );
      nextLabel = t('Next row →');
    } else {
      verdict = (
        <Verdict
          tone={step.outcome}
          emoji={step.outcome === 'same' ? '😱' : '🍺'}
          title={step.outcome === 'same' ? t('Same value! Drink {n}', { n: step.sips }) : t('Wrong! Drink {n}', { n: step.sips })}
          sub={t('Turned cards get covered. Back to the bottom.')}
        />
      );
      nextLabel = t('Start over');
    }
  }

  return (
    <div className="bd bd-turn fill">
      <div className="bd-progress" aria-label={t('Row {n} of {total}', { n: row + 1, total: rows.length })}>
        {rows.map((_, i) => (
          <span key={i} className={i < row ? 'done' : i === row ? (step ? (failed ? 'fail' : 'done') : 'now') : ''} />
        ))}
      </div>

      <div className="bd-player">
        <span className="bd-avatar" style={{ background: driver.color }}>
          <Avatar avatar={driver.avatar} photo={driver.photo} />
        </span>
        <span className="bd-player-text">
          <span className="bd-player-name">{driver.name}</span>
          <span className="bd-player-sub">
            {t('Attempt {n} · {sips} sips', { n: board.attempt - (failed ? 1 : 0), sips: board.drunk })}
          </span>
        </span>
        <DeckCount left={board.deck.length} />
      </div>

      <Board cols={Math.max(...rows)} rows={rows.length}>
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
                    <PlayingCard card={card} faceUp={isUp} waiting={picked && !isUp} />
                  </button>
                );
              })}
            </div>
            <span className="board-row-sips">×{r + 1}</span>
          </div>
        ))}
      </Board>

      <h2 className="bd-question">
        <span className="bd-question-num">
          {t('Row {n}/{total}', { n: row + 1, total: rows.length })}
          {prev && questions[row] === 'higher-lower' ? ` · ${t('than {card}', { card: cardName(prev) })}` : ''}
        </span>{' '}
        {t(TITLES[questions[row]])}
      </h2>

      <div className="bd-foot">
        {step ? (
          <>
            {verdict}
            <BigButton size="xl" variant={failed ? 'primary' : 'light'} onClick={next}>
              {nextLabel}
            </BigButton>
          </>
        ) : slot === null ? (
          <p className="notice center bd-foot-note">
            {known ? t('Pick a card in row {n}.', { n: row + 1 }) : t('Pick a card in row {n}: tap the left or the right one.', { n: row + 1 })}
          </p>
        ) : (
          <Answers questionId={questions[row]} onAnswer={answer} />
        )}
      </div>
    </div>
  );
}

/** How much of a card the row above it hides (part of its height): like cards laid on a table. */
const OVERLAP = 0.18;

/** The board, rows bottom to top: its cards as big as the room it gets allows. */
function Board({ cols, rows, children }: { cols: number; rows: number; children: ReactNode }) {
  const [ref, box] = useBox<HTMLDivElement>();
  // The box's padding (10px) and the number and sips columns (30px each) are no room for cards;
  // the rows overlap a little, so the board's height holds bigger cards.
  const byHeight = box.h ? Math.floor((box.h - 20) / (1.4 * (rows - OVERLAP * (rows - 1)))) : 0;
  const cw = Math.min(fitCards({ w: box.w - 20 - 60, h: 10_000 }, cols, 1, 10, 0, 120, 24), byHeight || 24);
  return (
    <div ref={ref} className="board" style={{ '--board-cw': `${cw}px` } as CSSProperties}>
      {children}
    </div>
  );
}

function cardKey(c: Card) {
  return `${c.value}${c.suit}`;
}
