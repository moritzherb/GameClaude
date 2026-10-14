import type { CSSProperties } from 'react';
import Avatar from '../../components/Avatar';
import { getLang, t } from '../../i18n';
import type { Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { FURTHEST_SIPS, rating } from '../vote/logic';
import VoteGame, { names, Verdict, type Round } from '../vote/VoteGame';
import { FLAWS } from './cards';

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const EMOJI: Record<string, string> = { he: '🙋‍♂️', she: '🙋‍♀️' };

const lead = (who: string) => (who === 'she' ? t('She’s a 10, but …') : t('He’s a 10, but …'));
/** 6.3 or 6,3: one decimal at most. */
const fmt = (n: number) => n.toLocaleString(getLang() === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 1 });

function Card({ round, small }: { round: Round; small?: boolean }) {
  return (
    <div className={`vt-card tb-card${small ? ' small' : ''}`}>
      {!small && <span className="vt-card-emoji">{EMOJI[round.who]}</span>}
      <span className="vt-card-title">{lead(round.who)}</span>
      <span className="vt-card-text">… {t(round.text)}</span>
    </div>
  );
}

function Ballot({ round, vote }: { round: Round; vote: (v: number) => void }) {
  return (
    <div className="tb-ballot">
      <span className="tb-ballot-title">{round.who === 'she' ? t('She drops to …') : t('He drops to …')}</span>
      <div className="tb-scores">
        {SCORES.map((n) => (
          <button key={n} type="button" className={`tb-score${n === 10 ? ' ten' : ''}`} onClick={() => vote(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Result({ round, votes, players }: { round: Round; votes: Record<string, number>; players: Player[] }) {
  const { average, furthest } = rating(votes);
  const off = players.filter((p) => furthest.includes(p.id));
  return (
    <>
      <div className="tb-average">
        <span className="tb-average-n">
          {fmt(average)}
          <small>/10</small>
        </span>
        <span className="tb-average-sub">{round.who === 'she' ? t('That’s where she drops to.') : t('That’s where he drops to.')}</span>
      </div>
      {/* Everyone's number: a column per score, from 0 to 10. */}
      <div className="tb-spread">
        {SCORES.map((n) => {
          const here = players.filter((p) => votes[p.id] === n);
          return (
            <div key={n} className={`tb-col${here.length ? ' used' : ''}`}>
              <span className="tb-col-people">
                {here.map((p) => (
                  <span key={p.id} className={`tb-dot${furthest.includes(p.id) ? ' drinks' : ''}`} style={{ '--chip': p.color } as CSSProperties} title={p.name}>
                    <Avatar avatar={p.avatar} photo={p.photo} />
                  </span>
                ))}
              </span>
              <span className="tb-col-n">{n}</span>
            </div>
          );
        })}
      </div>
      {off.length ? (
        <Verdict tone="bad" emoji="🍻" title={t('Furthest off drinks {n}', { n: FURTHEST_SIPS })} sub={names(off)} />
      ) : (
        <Verdict tone="good" emoji="🤝" title={t('All the same number. Nobody drinks.')} />
      )}
    </>
  );
}

const judge = (votes: Record<string, number>) => Object.fromEntries(rating(votes).furthest.map((id) => [id, FURTHEST_SIPS]));

export default function TenBut(props: GameProps) {
  return (
    <VoteGame<number>
      {...props}
      game="ten-but"
      cards={FLAWS}
      modes={[
        { id: 'he', emoji: '🙋‍♂️', label: t('He') },
        { id: 'she', emoji: '🙋‍♀️', label: t('She') },
        { id: 'mixed', emoji: '🎲', label: t('Mixed'), mixed: true },
      ]}
      modeTitle={t('Who’s it about?')}
      intro={t('A card says: a 10, but … Everyone taps in secret where that drops them, from 0 to 10. Whoever is furthest from the average drinks.')}
      Card={Card}
      Ballot={Ballot}
      judge={judge}
      Result={Result}
    />
  );
}
