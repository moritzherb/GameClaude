import BigButton from '../../components/BigButton';
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
        <span className="kicker">Ride complete</span>
        <h2 className="bd-title big">{driver.name} made it!</h2>
        <p className="lead">{fails === 0 ? 'First try. Legend.' : `${fails} restart${fails > 1 ? 's' : ''} and ${stats.drunk} sips later.`}</p>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Attempts</span>
          <span className="stat-value">{stats.attempt}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Sips drunk</span>
          <span className="stat-value">{stats.drunk}</span>
        </div>
        <div className="stat wide">
          <span className="stat-label">Cards flipped</span>
          <span className="stat-value">{stats.drawn}</span>
        </div>
      </div>
      <div className="sticky-action stack">
        <BigButton onClick={onPlayAgain}>Play again</BigButton>
        <BigButton variant="glass" onClick={onExit}>
          Back to games
        </BigButton>
      </div>
    </div>
  );
}
