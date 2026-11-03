import { t } from '../../i18n';
import type { GameProps } from '../types';
import CardGame, { type Round } from '../vote/CardGame';
import { TREATMENTS } from './cards';
import { Head, type Royal } from './Heads';

const label = (r: Royal) => (r === 'king' ? t('King Treatment') : t('Princess Treatment'));

function Card({ round }: { round: Round }) {
  return (
    <div className="vt-card ph-card">
      <span className="vt-card-title">{t('Princess or King Treatment?')}</span>
      <span className="vt-card-text">{t(round.text)}</span>
    </div>
  );
}

/** One tap for the whole table: which treatment is it? */
function Choice({ chosen, choose }: { round: Round; chosen: Royal | null; choose: (r: Royal) => void }) {
  return (
    <div className="ph-choices">
      <Head who="princess" label={t('Princess')} chosen={chosen} onPick={choose} />
      <Head who="king" label={t('King')} chosen={chosen} onPick={choose} />
      {chosen && (
        <span key={chosen} className="ph-verdict" aria-live="polite">
          {label(chosen)}!
        </span>
      )}
    </div>
  );
}

function Summary({ picks }: { picks: Royal[] }) {
  const n = (r: Royal) => picks.filter((p) => p === r).length;
  return (
    <div className="ph-summary">
      {(['princess', 'king'] as const).map((r) => (
        <div key={r} className={`ph-summary-side ${r}`}>
          <span className="ph-summary-n">{n(r)}</span>
          <span className="ph-summary-label">{label(r)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Treatment(props: GameProps) {
  return <CardGame<Royal> {...props} game="princess-treatment" cards={TREATMENTS} Card={Card} Choice={Choice} Summary={Summary} />;
}
