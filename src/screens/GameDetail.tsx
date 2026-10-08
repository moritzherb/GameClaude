import type { CSSProperties } from 'react';
import BigButton from '../components/BigButton';
import { gameNumber } from '../components/GameCard';
import Intensity from '../components/Intensity';
import RulesList from '../components/RulesList';
import TopBar from '../components/TopBar';
import type { GameDefinition } from '../games/types';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

export default function GameDetail({ game }: { game: GameDefinition }) {
  const { players } = useApp();
  const missing = Math.max(0, game.minPlayers - players.length);
  const tooMany = game.maxPlayers != null && players.length > game.maxPlayers;
  const playerRange = game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers}` : `${game.minPlayers}+`;

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.games())} />

      <section className="detail-hero fade-up" style={{ '--card-bg': game.color } as CSSProperties}>
        <span className="detail-no">No. {gameNumber(game)}</span>
        <span className="detail-emoji" aria-hidden>
          {game.emoji}
        </span>
        <h1 className="detail-name">{game.name}</h1>
        <p className="detail-tagline">{game.tagline}</p>
      </section>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Players</span>
          <span className="stat-value">{playerRange}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Intensity</span>
          <span className="stat-value">
            <Intensity level={game.intensity} showLabel />
          </span>
        </div>
        {game.needs?.length ? (
          <div className="stat wide">
            <span className="stat-label">You’ll need</span>
            <span className="stat-value">{game.needs.join(' · ')}</span>
          </div>
        ) : null}
      </div>

      <section className="panel">
        <h2 className="section-title">How to play</h2>
        <RulesList rules={game.rules} />
      </section>

      <div className="sticky-action">
        {game.online ? (
          <OnlineStart game={game} />
        ) : !game.component ? (
          <BigButton variant="glass" disabled>
            Coming soon
          </BigButton>
        ) : missing > 0 ? (
          <BigButton variant="light" size="xl" onClick={() => navigate(paths.players(paths.game(game.id)))}>
            Add {missing} more player{missing > 1 ? 's' : ''}
          </BigButton>
        ) : tooMany ? (
          <BigButton variant="light" onClick={() => navigate(paths.players(paths.game(game.id)))}>
            Max {game.maxPlayers} players
          </BigButton>
        ) : (
          <BigButton size="xl" onClick={() => navigate(paths.play(game.id))}>
            Start game
          </BigButton>
        )}
      </div>
    </main>
  );
}

/** Games for every phone start from a room: the host starts them for everyone. */
function OnlineStart({ game }: { game: GameDefinition }) {
  const room = useRoom();
  const inRoom = room.status === 'open' || room.status === 'reconnecting';
  if (!inRoom) {
    return (
      <BigButton size="xl" onClick={() => navigate(paths.room)}>
        Play together
      </BigButton>
    );
  }
  if (room.game === game.id) {
    return (
      <BigButton size="xl" onClick={() => navigate(paths.online(game.id))}>
        Back to the game
      </BigButton>
    );
  }
  if (room.role !== 'host') {
    return (
      <BigButton variant="glass" disabled>
        Only the host can start it
      </BigButton>
    );
  }
  return (
    <BigButton
      size="xl"
      onClick={() => {
        room.startGame(game.id);
        navigate(paths.online(game.id));
      }}
    >
      Start for everyone in the room
    </BigButton>
  );
}
