import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import { t } from '../../i18n';
import { rankLabel, type Card } from '../../lib/cards';
import { buzz, sfx } from '../../lib/fx';
import { useApp, type Player } from '../../state/AppState';
import { Verdict, VERDICT_DELAY_MS } from './Answers';
import { dealTiebreak, flipTiebreak, type TiebreakOutcome, type TiebreakState } from './pyramid';
import Avatar from '../../components/Avatar';

interface Shown {
  /** The flip the screen shows the result of. */
  flips: number;
  remaining: string[];
  justSafe: string[];
  outcome: TiebreakOutcome;
}

interface Props {
  tied: Player[];
  onDone: (driver: Player) => void;
}

/**
 * Tiebreaker: fresh deck, every tied player gets one card, then the deck is flipped.
 * Your value shows up → you're safe. The last one still holding a card drives the bus.
 */
export default function Tiebreak({ tied, onDone }: Props) {
  const known = useApp().knows('bus-driver');
  const [tb, setTb] = useState<TiebreakState>(() => dealTiebreak(tied.map((p) => p.id)));
  const [attempt, setAttempt] = useState(1);
  const [outcome, setOutcome] = useState<TiebreakOutcome>({ kind: 'continue' });
  // What the screen shows: it catches up with a flip only once the card has turned and lain there
  // a moment (who's safe, the line under the card, how it ended).
  const [shown, setShown] = useState<Shown>(() => ({ flips: 0, remaining: tb.remaining, justSafe: [], outcome: { kind: 'continue' } }));
  const showTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(showTimer.current), []);
  // Flip count already handled, so a double tap can't flip twice before React re-renders.
  const handled = useRef(-1);

  const inPlay = tied.filter((p) => p.id in tb.cards);
  const byId = (id: string) => tied.find((p) => p.id === id)!;
  const last = tb.flipped.at(-1);

  const flip = () => {
    if (handled.current === tb.flipped.length || outcome.kind !== 'continue') return;
    handled.current = tb.flipped.length;
    const r = flipTiebreak(tb);
    setTb(r.state);
    setOutcome(r.outcome);
    window.clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => {
      setShown({ flips: r.state.flipped.length, remaining: r.state.remaining, justSafe: r.safe, outcome: r.outcome });
      if (r.outcome.kind === 'driver') {
        sfx.boo();
        buzz([80, 60, 80, 60, 200]);
      } else if (r.safe.length) {
        sfx.tada();
        buzz([30, 40, 30]);
      } else sfx.tick();
    }, VERDICT_DELAY_MS);
  };

  const redo = (ids: string[]) => {
    handled.current = -1;
    const next = dealTiebreak(ids);
    window.clearTimeout(showTimer.current);
    setTb(next);
    setAttempt((a) => a + 1);
    setOutcome({ kind: 'continue' });
    setShown({ flips: 0, remaining: next.remaining, justSafe: [], outcome: { kind: 'continue' } });
  };

  const { justSafe, outcome: ended } = shown;
  // The card has turned, but the screen hasn't caught up with it yet.
  const pending = shown.flips !== tb.flipped.length;

  // The line under the flipped card: what it did, or how it ended.
  let line: string;
  if (pending) line = '';
  else if (ended.kind === 'driver') line = t('{name} drives the bus!', { name: byId(ended.id).name });
  else if (ended.kind === 'redo') line = t('Still tied!');
  else if (!last) line = t('Ready?');
  else if (!justSafe.length) line = t('{rank}. Nobody’s safe.', { rank: rankLabel(last.value) });
  else {
    const names = justSafe.map((id) => byId(id).name).join(' & ');
    line = justSafe.length > 1 ? t('{rank}! {names} are safe.', { rank: rankLabel(last.value), names }) : t('{rank}! {names} is safe.', { rank: rankLabel(last.value), names });
  }

  // One screen, nothing moves: how it ends pops up over the table instead of pushing it down.
  return (
    <div className="bd bd-tb fill">
      <div className="bd-head">
        <span className="kicker">{attempt > 1 ? t('Tiebreaker · round {n}', { n: attempt }) : t('Tiebreaker')}</span>
        <h2 className="bd-title">{t('Whose card shows up first?')}</h2>
        {!known && <p className="lead">{t('Everyone got a new card. We flip the deck: when your value shows up, you’re safe. The last one left drives the bus.')}</p>}
      </div>

      {/* Four or more: compact rows in two columns, so it all still fits one screen. */}
      <div className={`tb-players${inPlay.length > 3 ? ' many' : ''}`}>
        {inPlay.map((p, i) => {
          const safe = !shown.remaining.includes(p.id);
          return (
            <div key={p.id} className={`tb-player${safe ? ' safe' : ''}${justSafe.includes(p.id) ? ' just' : ''}`} style={{ '--chip': p.color } as CSSProperties}>
              <span className="bd-avatar sm" style={{ background: p.color }}>
                <Avatar avatar={p.avatar} photo={p.photo} />
              </span>
              <span className="tb-who">
                <span className="tb-name">{p.name}</span>
                <span className="tb-state">{safe ? t('Safe ✓') : t('Waiting…')}</span>
              </span>
              {/* Dealt from the deck, one after the other, and turned. */}
              <DrawnCard key={`${attempt}-${p.id}`} card={tb.cards[p.id]} className="tb-dealt" delay={i * 160} />
            </div>
          );
        })}
      </div>

      <div className="tb-table">
        <div className="tb-cards">
          <span className="tb-deck" aria-hidden>
            <PlayingCard card={null} faceUp={false} size="lg" />
            <PlayingCard card={null} faceUp={false} size="lg" />
          </span>
          <span className="tb-drawn">
            {last ? (
              <DrawnCard key={tb.flipped.length} card={last} className="tb-draw" size="lg" />
            ) : (
              <span className="tb-slot" aria-hidden />
            )}
          </span>
        </div>
        <span key={line} className="tb-flip-text">
          {line}
        </span>
        <span className="fine-print">{t('{n} flipped', { n: tb.flipped.length })}</span>
      </div>

      {ended.kind === 'driver' && <Verdict tone="same" emoji="🚌" title={t('{name} drives the bus!', { name: byId(ended.id).name })} />}
      {ended.kind === 'redo' && (
        <Verdict tone="correct" emoji="🔁" title={t('Still tied!')} sub={t('{names} go again with new cards.', { names: ended.ids.map((id) => byId(id).name).join(' & ') })} />
      )}

      <div className="sticky-action">
        {ended.kind === 'driver' ? (
          <BigButton size="xl" onClick={() => onDone(byId(ended.id))}>
            {t('Continue')}
          </BigButton>
        ) : ended.kind === 'redo' ? (
          <BigButton size="xl" onClick={() => redo(ended.ids)}>
            {t('Deal new cards')}
          </BigButton>
        ) : (
          <BigButton size="xl" variant="light" onClick={flip}>
            {t('Flip next card')}
          </BigButton>
        )}
      </div>
    </div>
  );
}

/** A card drawn from the deck: it slides in face down, then turns over. */
function DrawnCard({ card, className, delay = 0, size }: { card: Card; className: string; delay?: number; size?: 'lg' }) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setUp(true), delay + 380);
    return () => window.clearTimeout(id);
  }, [delay]);
  return (
    <span className={className} style={{ animationDelay: `${delay}ms` }}>
      <PlayingCard card={card} faceUp={up} size={size} />
    </span>
  );
}
