import type { CSSProperties } from 'react';
import BigButton from '../components/BigButton';
import { gameNumber } from '../components/GameCard';
import Intensity from '../components/Intensity';
import RulesList from '../components/RulesList';
import TopBar from '../components/TopBar';
import { playerRange, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

export default function GameDetail({ game }: { game: GameDefinition }) {
  const { players } = useApp();
  const missing = Math.max(0, game.minPlayers - players.length);
  const tooMany = !game.picksPlayers && game.maxPlayers != null && players.length > game.maxPlayers;
  const range = playerRange(game);

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.games())} />

      <section className="detail-hero fade-up" style={{ '--card-bg': game.color } as CSSProperties}>
        <span className="detail-no">{t('No. {n}', { n: gameNumber(game) })}</span>
        <span className="detail-emoji" aria-hidden>
          {game.emoji}
        </span>
        <h1 className="detail-name">{t(game.name)}</h1>
        <p className="detail-tagline">{t(game.tagline)}</p>
      </section>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">{t('Players')}</span>
          <span className="stat-value">{range}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('Intensity')}</span>
          <span className="stat-value">
            <Intensity level={game.intensity} showLabel />
          </span>
        </div>
        {game.needs?.length ? (
          <div className="stat wide">
            <span className="stat-label">{t('You’ll need')}</span>
            <span className="stat-value">{game.needs.map((n) => t(n)).join(' · ')}</span>
          </div>
        ) : null}
      </div>

      <section className="panel">
        <h2 className="section-title">{t('How to play')}</h2>
        <RulesList rules={game.rules} />
      </section>

      <div className="sticky-action">
        {game.online ? (
          <OnlineStart game={game} />
        ) : !game.component ? (
          <BigButton variant="glass" disabled>
            {t('Coming soon')}
          </BigButton>
        ) : missing > 0 ? (
          <BigButton variant="light" size="xl" onClick={() => navigate(paths.players(paths.game(game.id)))}>
            {missing > 1 ? t('Add {n} more players', { n: missing }) : t('Add {n} more player', { n: missing })}
          </BigButton>
        ) : tooMany ? (
          <BigButton variant="light" onClick={() => navigate(paths.players(paths.game(game.id)))}>
            {t('Max {n} players', { n: game.maxPlayers ?? 0 })}
          </BigButton>
        ) : (
          <BigButton size="xl" onClick={() => navigate(paths.play(game.id))}>
            {t('Start game')}
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
        {t('Play together')}
      </BigButton>
    );
  }
  if (room.game === game.id) {
    return (
      <BigButton size="xl" onClick={() => navigate(paths.online(game.id))}>
        {t('Back to the game')}
      </BigButton>
    );
  }
  if (room.role !== 'host') {
    return (
      <BigButton variant="glass" disabled>
        {t('Only the host can start it')}
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
      {t('Start for everyone in the room')}
    </BigButton>
  );
}
