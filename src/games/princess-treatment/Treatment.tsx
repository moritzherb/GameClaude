import { t } from '../../i18n';
import type { Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { MINORITY_SIPS, minority, sipsFor, TIE_SIPS } from '../vote/logic';
import VoteGame, { names, Verdict, Voters, type Round } from '../vote/VoteGame';
import { TREATMENTS } from './cards';

type Vote = 'treat' | 'bare';
const OPTIONS = ['treat', 'bare'] as const;

const EMOJI: Record<string, string> = { princess: '👸', king: '🤴' };
const treatment = (who: string) => (who === 'king' ? t('King Treatment') : t('Princess Treatment'));

function Card({ round, small }: { round: Round; small?: boolean }) {
  return (
    <div className={`vt-card pt-card${small ? ' small' : ''}`}>
      {!small && <span className="vt-card-emoji">{EMOJI[round.who]}</span>}
      <span className="vt-card-title">{t('{treatment} or Bare Minimum?', { treatment: treatment(round.who) })}</span>
      <span className="vt-card-text">{t(round.text)}</span>
    </div>
  );
}

function Ballot({ round, vote }: { round: Round; vote: (v: Vote) => void }) {
  return (
    <div className="pt-choices">
      <button type="button" className="pt-choice treat" onClick={() => vote('treat')}>
        <span className="pt-choice-emoji">{EMOJI[round.who]}</span>
        <span className="pt-choice-label">{treatment(round.who)}</span>
      </button>
      <button type="button" className="pt-choice bare" onClick={() => vote('bare')}>
        <span className="pt-choice-emoji">😐</span>
        <span className="pt-choice-label">{t('Bare Minimum')}</span>
      </button>
    </div>
  );
}

function Result({ round, votes, players }: { round: Round; votes: Record<string, Vote>; players: Player[] }) {
  const verdict = minority(votes, OPTIONS);
  const losers = verdict.kind === 'minority' ? verdict.losers : [];
  const side = (v: Vote) => players.filter((p) => votes[p.id] === v);
  const drinks = (v: Vote) => verdict.kind === 'tie' || side(v).some((p) => losers.includes(p.id));
  return (
    <>
      <div className="pt-sides">
        {OPTIONS.map((v) => (
          <section key={v} className={`pt-side ${v}${drinks(v) ? ' drinks' : ''}`}>
            <span className="pt-side-head">
              <span className="pt-side-emoji">{v === 'treat' ? EMOJI[round.who] : '😐'}</span>
              <span className="pt-side-label">{v === 'treat' ? treatment(round.who) : t('Bare Minimum')}</span>
              <span className="pt-side-n">{side(v).length}</span>
            </span>
            <Voters list={side(v)} drink={drinks(v)} />
          </section>
        ))}
      </div>
      {verdict.kind === 'minority' ? (
        <Verdict tone="bad" emoji="🍻" title={t('The minority drinks {n}', { n: MINORITY_SIPS })} sub={names(players.filter((p) => losers.includes(p.id)))} />
      ) : verdict.kind === 'tie' ? (
        <Verdict tone="same" emoji="⚖️" title={t('A tie! Everyone drinks {n}', { n: TIE_SIPS })} />
      ) : (
        <Verdict tone="good" emoji="🤝" title={t('All agreed. Nobody drinks.')} />
      )}
    </>
  );
}

const judge = (votes: Record<string, Vote>, ids: string[]) => sipsFor(minority(votes, OPTIONS), ids);

export default function Treatment(props: GameProps) {
  return (
    <VoteGame<Vote>
      {...props}
      game="princess-treatment"
      cards={TREATMENTS}
      modes={[
        { id: 'princess', emoji: '👸', label: t('Princess') },
        { id: 'king', emoji: '🤴', label: t('King') },
        { id: 'mixed', emoji: '👑', label: t('Both'), mixed: true },
      ]}
      modeTitle={t('Princess or King?')}
      intro={t('A card shows something someone does for you. Everyone votes in secret: Treatment or Bare Minimum? The minority drinks.')}
      Card={Card}
      Ballot={Ballot}
      judge={judge}
      Result={Result}
    />
  );
}
