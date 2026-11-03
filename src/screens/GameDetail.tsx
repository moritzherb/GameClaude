import type { CSSProperties } from 'react';
import BigButton from '../components/BigButton';
import { gameNumber } from '../components/GameCard';
import Intensity from '../components/Intensity';
import RulesList from '../components/RulesList';
import TopBar from '../components/TopBar';
import { playerRange, type GameDefinition } from '../games/types';
import { GameGlyph } from '../home/AppIcon';
import { useLook } from '../home/usePlatform';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

/**
 * A game's name for the big card: it may break after a slash between words ("Princess/ King", not "10/ 10"), and the longest
 * word decides how small the type has to get so that no word sticks out of the card. A word past
 * the card's rounded, clipped edge can make iPhones drop the card's whole content.
 */
function cardName(name: string) {
  const text = name.replace(/(?<=\p{L})\/(?=\p{L})/gu, '/\u200b');
  const longest = Math.max(...text.split(/[\s\u200b]+/).map((w) => [...w].length));
  return { text, longest };
}

export default function GameDetail({ game }: { game: GameDefinition }) {
  const { players } = useApp();
  const pop = useLook() === 'pop';
  const missing = Math.max(0, game.minPlayers - players.length);
  const tooMany = !game.picksPlayers && game.maxPlayers != null && players.length > game.maxPlayers;
  const range = playerRange(game);
  const name = cardName(t(game.name));

  return (
    <main className={`screen game-detail${game.online && game.component ? ' two-buttons' : ''}`}>
      {/* New look: back to the home screen the game was opened from. */}
      <TopBar onBack={() => navigate(pop ? paths.home : paths.games())} />

      <section className="detail-hero fade-up" style={{ '--card-bg': game.color } as CSSProperties}>
        <span className="detail-no">{t('No. {n}', { n: gameNumber(game) })}</span>
        <span className="detail-emoji" aria-hidden>
          {pop ? <GameGlyph game={game} /> : game.emoji}
        </span>
        <h1 className="detail-name" style={{ '--longest': name.longest } as CSSProperties}>
          {name.text}
        </h1>
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

      <div className={`sticky-action${game.online && game.component ? ' stack' : ''}`}>
        {game.online && !game.component ? (
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
        {/* Also playable with every player on their own phone. */}
        {game.online && game.component && <OnlineStart game={game} second />}
      </div>
    </main>
  );
}

/** Games for every phone start from a room: the host starts them for everyone. */
function OnlineStart({ game, second }: { game: GameDefinition; /** Next to the one-phone start: smaller. */ second?: boolean }) {
  const room = useRoom();
  const inRoom = room.status === 'open' || room.status === 'reconnecting';
  if (!inRoom) {
    return second ? (
      <BigButton variant="glass" onClick={() => navigate(paths.room)}>
        {t('📱 Each on their own phone')}
      </BigButton>
    ) : (
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
      size={second ? undefined : 'xl'}
      variant={second ? 'glass' : undefined}
      onClick={() => {
        room.startGame(game.id);
        navigate(paths.online(game.id));
      }}
    >
      {t('Start for everyone in the room')}
    </BigButton>
  );
}
