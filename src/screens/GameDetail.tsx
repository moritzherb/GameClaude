import BigButton from '../components/BigButton';
import Intensity from '../components/Intensity';
import RulesList from '../components/RulesList';
import TopBar from '../components/TopBar';
import type { GameDefinition } from '../games/types';
import { navigate, paths } from '../lib/router';
import { useApp } from '../state/AppState';

export default function GameDetail({ game }: { game: GameDefinition }) {
  const { players } = useApp();
  const missing = Math.max(0, game.minPlayers - players.length);
  const tooMany = game.maxPlayers != null && players.length > game.maxPlayers;
  const playerRange = game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers}` : `${game.minPlayers}+`;

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.games())} />

      <section className="detail-hero">
        <div className="detail-emoji wobble" style={{ background: game.color }}>
          {game.emoji}
        </div>
        <h1 className="detail-name">{game.name}</h1>
        <p className="detail-tagline">{game.tagline}</p>
        <div className="pills">
          <span className="pill">👥 {playerRange} players</span>
          <span className="pill">
            <Intensity level={game.intensity} showLabel />
          </span>
          {game.needs?.map((n) => (
            <span key={n} className="pill">
              🧰 {n}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">How to play</h2>
        <RulesList rules={game.rules} />
      </section>

      <div className="sticky-action">
        {!game.component ? (
          <BigButton color="var(--white)" disabled>
            COMING SOON 🔜
          </BigButton>
        ) : missing > 0 ? (
          <BigButton color="var(--cyan)" size="xl" onClick={() => navigate(paths.players(paths.game(game.id)))}>
            👥 ADD {missing} MORE PLAYER{missing > 1 ? 'S' : ''}
          </BigButton>
        ) : tooMany ? (
          <BigButton color="var(--orange)" onClick={() => navigate(paths.players(paths.game(game.id)))}>
            👥 MAX {game.maxPlayers} PLAYERS
          </BigButton>
        ) : (
          <BigButton color="var(--lime)" size="xl" onClick={() => navigate(paths.play(game.id))}>
            LET’S GO! 🚀
          </BigButton>
        )}
      </div>
    </main>
  );
}
