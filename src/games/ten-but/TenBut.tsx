import { t } from '../../i18n';
import type { GameProps } from '../types';
import CardGame, { type Round } from '../vote/CardGame';
import { FLAWS } from './cards';

const EMOJI: Record<string, string> = { he: '🙋‍♂️', she: '🙋‍♀️' };
const lead = (who: string) => (who === 'she' ? t('She’s a 10, but …') : t('He’s a 10, but …'));

/** The statement, big: nothing to vote, just to talk about. */
function Card({ round }: { round: Round }) {
  return (
    <div className="vt-card tn-card">
      <span className="vt-card-emoji" aria-hidden="true">
        {EMOJI[round.who]}
      </span>
      <span className="vt-card-title">{lead(round.who)}</span>
      <span className="vt-card-text">… {t(round.text)}</span>
    </div>
  );
}

export default function TenBut(props: GameProps) {
  return (
    <CardGame
      {...props}
      game="ten-but"
      cards={FLAWS}
      modes={[
        { id: 'he', emoji: '🙋‍♂️', label: t('He') },
        { id: 'she', emoji: '🙋‍♀️', label: t('She') },
        { id: 'mixed', label: t('Mixed'), mixed: true },
      ]}
      modeTitle={t('Who’s it about?')}
      intro={t('A card says: a 10, but … Read it out and talk about it: still a 10? Then the next card.')}
      Card={Card}
    />
  );
}
