import { useState, type CSSProperties } from 'react';
import BigButton from '../components/BigButton';
import { gameNumber } from '../components/GameCard';
import { PhoneIcon } from '../components/Icons';
import Intensity from '../components/Intensity';
import RulesList from '../components/RulesList';
import TopBar from '../components/TopBar';
import { IconArt } from '../home/AppIcon';
import { CATEGORIES, playerRange, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { takeLaunch, type LaunchFrom } from '../lib/launch';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

/** Opening from the home screen: the icon grows to fill the screen in its colour, then fades into the page. */
function LaunchVeil({ from, color, emoji }: { from: LaunchFrom; color: string; emoji: string }) {
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <div
      className="launch-veil"
      aria-hidden
      style={{ '--lx': `${from.x}px`, '--ly': `${from.y}px`, '--ls': from.scale, '--c': color } as CSSProperties}
      onAnimationEnd={(e) => e.target === e.currentTarget && setDone(true)}
    >
      <span className="launch-emoji">{emoji}</span>
    </div>
  );
}

/**
 * A game's page, the way the phone's own store shows an app: the icon, the name, the facts in a
 * row, then how to play. The start button stays at the bottom.
 */
export default function GameDetail({ game }: { game: GameDefinition }) {
  const { players } = useApp();
  const [from] = useState(takeLaunch);
  const missing = Math.max(0, game.minPlayers - players.length);
  const tooMany = !game.picksPlayers && game.maxPlayers != null && players.length > game.maxPlayers;
  const range = playerRange(game);
  const kind = CATEGORIES.find((c) => c.id === game.categories[0]);

  return (
    <main className={`screen game-detail store${game.online && game.component ? ' two-buttons' : ''}${from ? ' launching' : ''}`}>
      {from && <LaunchVeil from={from} color={game.color} emoji={game.emoji} />}
      <TopBar onBack={() => navigate(paths.home)} />

      <header className="st-head">
        <IconArt color={game.color} size="lg">
          {game.emoji}
        </IconArt>
        <div className="st-titles">
          <h1 className="st-name">{t(game.name)}</h1>
          <p className="st-tagline">{t(game.tagline)}</p>
          <span className="st-dev">prost! · {t('No. {n}', { n: gameNumber(game) })}</span>
        </div>
      </header>

      <div className="st-info">
        <div className="st-fact">
          <span className="st-k">{t('Players')}</span>
          <span className="st-v">{range}</span>
        </div>
        <div className="st-fact">
          <span className="st-k">{t('Intensity')}</span>
          <span className="st-v">
            <Intensity level={game.intensity} showLabel />
          </span>
        </div>
        {kind && (
          <div className="st-fact">
            <span className="st-k">{t('Kind')}</span>
            <span className="st-v" aria-hidden>
              {kind.emoji}
            </span>
            <span className="st-s">{t(kind.label)}</span>
          </div>
        )}
        {game.online && (
          <div className="st-fact">
            <span className="st-k">{t('Phones')}</span>
            <span className="st-v">
              <PhoneIcon />
            </span>
            <span className="st-s">{t(game.phones ?? 'Every phone')}</span>
          </div>
        )}
      </div>

      {game.needs?.length ? (
        <section className="st-section">
          <h2 className="st-h">{t('You’ll need')}</h2>
          <p className="st-p">{game.needs.map((n) => t(n)).join(' · ')}</p>
        </section>
      ) : null}

      <section className="st-section">
        <h2 className="st-h">{t('How to play')}</h2>
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
