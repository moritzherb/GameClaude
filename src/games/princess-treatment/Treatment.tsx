import { t } from '../../i18n';
import type { GameProps } from '../types';
import CardGame, { type Round } from '../vote/CardGame';
import { TREATMENTS } from './cards';
import { Head, type Royal, type Verdict } from './Heads';

/** The card's treatment: a Princess one (something done for her) or a King one (for him). */
const royal = (round: Round): Royal => (round.who === 'king' ? 'king' : 'princess');
const label = (v: Verdict) => (v === 'bare' ? t('Bare Minimum') : v === 'king' ? t('King Treatment') : t('Princess Treatment'));

function Card({ round }: { round: Round }) {
  return (
    <div className={`vt-card ph-card ${royal(round)}`}>
      <span className="vt-card-title">{royal(round) === 'king' ? t('Bare Minimum or King Treatment?') : t('Bare Minimum or Princess Treatment?')}</span>
      <span className="vt-card-text">{t(round.text)}</span>
    </div>
  );
}

/** One tap for the whole table: just the bare minimum (left), or the card's treatment (right)? */
function Choice({ round, chosen, choose }: { round: Round; chosen: Verdict | null; choose: (v: Verdict) => void }) {
  return (
    <div className="ph-choices">
      <Head who="bare" label={t('Bare Minimum')} chosen={chosen} onPick={choose} />
      <Head who={royal(round)} label={label(royal(round))} chosen={chosen} onPick={choose} />
      {chosen && (
        <span key={chosen} className="ph-verdict" aria-live="polite">
          {label(chosen)}!
        </span>
      )}
    </div>
  );
}

/** How the cards went: bare minimum against the treatments that were in the game. */
function Summary({ picks, mode }: { picks: Verdict[]; mode: string }) {
  const sides: Verdict[] = ['bare', ...(mode === 'king' ? [] : ['princess' as const]), ...(mode === 'princess' ? [] : ['king' as const])];
  return (
    <div className="ph-summary">
      {sides.map((v) => (
        <div key={v} className={`ph-summary-side ${v}`}>
          <span className="ph-summary-n">{picks.filter((p) => p === v).length}</span>
          <span className="ph-summary-label">{label(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Treatment(props: GameProps) {
  return (
    <CardGame<Verdict>
      {...props}
      game="princess-treatment"
      cards={TREATMENTS}
      modes={[
        { id: 'princess', emoji: '👸', label: t('Princess') },
        { id: 'king', emoji: '🤴', label: t('King') },
        { id: 'mixed', emoji: '🎲', label: t('Mixed'), mixed: true },
      ]}
      modeTitle={t('Whose treatment?')}
      intro={t('A card shows something someone does for you. Just the Bare Minimum, or real Princess (or King) Treatment? Talk it over, one tap settles it.')}
      Card={Card}
      Choice={Choice}
      Summary={Summary}
    />
  );
}
