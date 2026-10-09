import BigButton from '../../components/BigButton';
import { t } from '../../i18n';
import type { Player } from '../../state/AppState';

export interface RideStats {
  attempt: number;
  drunk: number;
  drawn: number;
}

/** The bus has arrived: shared finish screen for every ride variant. */
export default function RideFinish({ driver, stats, onPlayAgain, onExit }: { driver: Player; stats: RideStats; onPlayAgain: () => void; onExit: () => void }) {
  const fails = stats.attempt - 1;
  return (
    <div className="bd driver">
      <div className="driver-hero pop-in">
        <span className="driver-bus">🏁</span>
        <span className="bd-avatar xl" style={{ background: driver.color }}>
          {driver.avatar}
        </span>
      </div>
      <div className="bd-head center">
        <span className="kicker">{t('Ride complete')}</span>
        <h2 className="bd-title big">{t('{name} made it!', { name: driver.name })}</h2>
        <p className="lead">
          {fails === 0
            ? t('First try. Legend.')
            : fails === 1
              ? t('{fails} restart and {sips} sips later.', { fails, sips: stats.drunk })
              : t('{fails} restarts and {sips} sips later.', { fails, sips: stats.drunk })}
        </p>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-label">{t('Attempts')}</span>
          <span className="stat-value">{stats.attempt}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('Sips drunk')}</span>
          <span className="stat-value">{stats.drunk}</span>
        </div>
        <div className="stat wide">
          <span className="stat-label">{t('Cards flipped')}</span>
          <span className="stat-value">{stats.drawn}</span>
        </div>
      </div>
      <div className="sticky-action stack">
        <BigButton onClick={onPlayAgain}>{t('Play again')}</BigButton>
        <BigButton variant="glass" onClick={onExit}>
          {t('Back to games')}
        </BigButton>
      </div>
    </div>
  );
}
