import { t } from '../../i18n';
import type { GameProps } from '../types';
import CardGame, { type Round } from '../vote/CardGame';
import { FLAWS } from './cards';
import Glyph from '../../components/Glyph';
import type { GlyphName } from '../../lib/glyphs';

const ICON: Record<string, GlyphName> = { he: 'guys', she: 'girls' };
const lead = (who: string) => (who === 'she' ? t('She’s a 10, but …') : t('He’s a 10, but …'));

/** The statement, big: nothing to vote, just to talk about. */
function Card({ round }: { round: Round }) {
  return (
    <div className={`vt-card tn-card ${round.who === 'she' ? 'she' : 'he'}`}>
      <span className="vt-card-emoji" aria-hidden="true">
        <Glyph name={ICON[round.who] ?? 'people'} />
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
        { id: 'he', icon: 'guys', label: t('He') },
        { id: 'she', icon: 'girls', label: t('She') },
        { id: 'mixed', label: t('Mixed'), mixed: true },
      ]}
      modeTitle={t('Who’s it about?')}
      intro={t('A card says: a 10, but … Read it out and talk about it: still a 10? Then the next card.')}
      Card={Card}
    />
  );
}
