import { useState } from 'react';
import BigButton from '../components/BigButton';
import { HelpIcon } from '../components/Icons';
import RulesList from '../components/RulesList';
import Sheet from '../components/Sheet';
import TopBar, { RoundButton } from '../components/TopBar';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { useWakeLock } from '../lib/wakeLock';
import { useRoom } from '../net/RoomProvider';

/** Shell for games played with every phone: same escape and rules buttons as offline games. */
export default function OnlinePlay({ game }: { game: GameDefinition }) {
  const room = useRoom();
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  useWakeLock();

  const Game = game.online;
  const inRoom = room.status === 'open' || room.status === 'reconnecting' || room.status === 'connecting';
  const isHost = room.role === 'host';

  if (!Game) return null;

  if (!inRoom) {
    return (
      <main className="screen">
        <TopBar onBack={() => navigate(paths.game(game.id))} />
        <div className="connecting">
          <div className="connecting-emoji">📱</div>
          <h1 className="bd-title">{t('{game} needs a room', { game: t(game.name) })}</h1>
          <p className="lead">{t('Every player uses their own phone. Open a room, let everyone join, then start the game from there.')}</p>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => navigate(paths.room)}>
            {t('Open Play together')}
          </BigButton>
        </div>
      </main>
    );
  }

  return (
    <main className="screen play-screen">
      <TopBar
        title={`${game.emoji} ${t(game.name)}`}
        onBack={() => setConfirmExit(true)}
        icon="close"
        right={
          <RoundButton label={t('Rules')} onClick={() => setShowRules(true)}>
            <HelpIcon />
          </RoundButton>
        }
      />

      {room.status === 'reconnecting' && <p className="notice">{t('Connection lost. Reconnecting…')}</p>}

      <Game />

      <Sheet open={showRules} onClose={() => setShowRules(false)} title={t('How to play')}>
        <RulesList rules={game.rules} />
      </Sheet>

      {/* Host: ends the game for everyone. Everyone else: leaves just this phone, after asking first too. */}
      <Sheet
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title={isHost ? t('End the game for everyone?') : t('Leave the game?')}
        closeLabel={t('Keep playing')}
      >
        {isHost ? (
          <BigButton
            variant="danger"
            onClick={() => {
              room.endGame();
              navigate(paths.room);
            }}
          >
            {t('End game')}
          </BigButton>
        ) : (
          <>
            <p className="lead">{t('The others keep playing. You can come back any time under Play together.')}</p>
            <BigButton variant="danger" onClick={() => navigate(paths.home)}>
              {t('Leave game')}
            </BigButton>
          </>
        )}
      </Sheet>
    </main>
  );
}
