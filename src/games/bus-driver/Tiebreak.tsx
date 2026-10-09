import { useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import { t } from '../../i18n';
import { rankLabel } from '../../lib/cards';
import { buzz, sfx } from '../../lib/fx';
import { useApp, type Player } from '../../state/AppState';
import { dealTiebreak, flipTiebreak, type TiebreakOutcome, type TiebreakState } from './pyramid';

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
  const [justSafe, setJustSafe] = useState<string[]>([]);
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
    setJustSafe(r.safe);
    setOutcome(r.outcome);
    window.setTimeout(() => {
      if (r.outcome.kind === 'driver') {
        sfx.boo();
        buzz([80, 60, 80, 60, 200]);
      } else if (r.safe.length) {
        sfx.tada();
        buzz([30, 40, 30]);
      } else sfx.tick();
    }, 450);
  };

  const redo = (ids: string[]) => {
    handled.current = -1;
    setTb(dealTiebreak(ids));
    setAttempt((a) => a + 1);
    setOutcome({ kind: 'continue' });
    setJustSafe([]);
  };

  return (
    <div className="bd">
      <div className="bd-head">
        <span className="kicker">{attempt > 1 ? t('Tiebreaker · round {n}', { n: attempt }) : t('Tiebreaker')}</span>
        <h2 className="bd-title">{t('Whose card shows up first?')}</h2>
        {outcome.kind === 'continue' && !known && (
          <p className="lead">{t('Everyone got a new card. We flip the deck: when your value shows up, you’re safe. The last one left drives the bus.')}</p>
        )}
      </div>

      {outcome.kind === 'driver' && (
        <div className="bd-result same">
          <span className="bd-result-emoji">🚌</span>
          <span className="bd-result-text">
            <span className="bd-result-title">{t('{name} drives the bus!', { name: byId(outcome.id).name })}</span>
          </span>
        </div>
      )}
      {outcome.kind === 'redo' && (
        <div className="bd-result correct">
          <span className="bd-result-emoji">🔁</span>
          <span className="bd-result-text">
            <span className="bd-result-title">{t('Still tied!')}</span>
            <span className="bd-result-sub">{t('{names} go again with new cards.', { names: outcome.ids.map((id) => byId(id).name).join(' & ') })}</span>
          </span>
        </div>
      )}


      <div className="tb-players">
        {inPlay.map((p) => {
          const safe = !tb.remaining.includes(p.id);
          return (
            <div key={p.id} className={`tb-player${safe ? ' safe' : ''}${justSafe.includes(p.id) ? ' just' : ''}`} style={{ '--chip': p.color } as CSSProperties}>
              <span className="bd-avatar sm" style={{ background: p.color }}>
                {p.avatar}
              </span>
              <span className="tb-name">{p.name}</span>
              <PlayingCard card={tb.cards[p.id]} />
              <span className="tb-state">{safe ? t('Safe ✓') : t('Waiting…')}</span>
            </div>
          );
        })}
      </div>

      <div className="tb-flip">
        <PlayingCard key={tb.flipped.length} card={last} faceUp={!!last} size="lg" waiting={!last} />
        <span className="tb-flip-text">
          {last
            ? justSafe.length
              ? justSafe.length > 1
                ? t('{rank}! {names} are safe.', { rank: rankLabel(last.value), names: justSafe.map((id) => byId(id).name).join(' & ') })
                : t('{rank}! {names} is safe.', { rank: rankLabel(last.value), names: justSafe.map((id) => byId(id).name).join(' & ') })
              : t('{rank}. Nobody’s safe.', { rank: rankLabel(last.value) })
            : t('Ready?')}
        </span>
        <span className="fine-print">{t('{n} flipped', { n: tb.flipped.length })}</span>
      </div>

      <div className="sticky-action">
        {outcome.kind === 'driver' ? (
          <BigButton size="xl" onClick={() => onDone(byId(outcome.id))}>
            {t('Continue')}
          </BigButton>
        ) : outcome.kind === 'redo' ? (
          <BigButton size="xl" onClick={() => redo(outcome.ids)}>
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
