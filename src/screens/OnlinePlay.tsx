import { useEffect, useMemo, useState } from 'react';
import BigButton from '../components/BigButton';
import { CrewContext } from '../components/Finished';
import GameBar from '../components/GameBar';
import RulesList from '../components/RulesList';
import Sheet from '../components/Sheet';
import TopBar from '../components/TopBar';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { markPlayed } from '../lib/recent';
import { TurnContext, type TurnPlayer } from '../lib/turn';
import { navigate, paths } from '../lib/router';
import { useWakeLock } from '../lib/wakeLock';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

/** Shell for games played with every phone: same escape and rules buttons as offline games. */
export default function OnlinePlay({ game }: { game: GameDefinition }) {
  const room = useRoom();
  const { settings } = useApp();
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  // Who's on, named by the game: a bubble in the bar on a clean table.
  const [turn, setTurn] = useState<TurnPlayer | null>(null);
  useWakeLock();
  // Everyone in the room: a game played to its end counts for them on this phone too.
  const crew = useMemo(
    () => room.members.map((m) => ({ id: m.id, personId: m.id, name: m.name, avatar: m.avatar, color: m.color })),
    [room.members],
  );

  const Game = game.online;
  const inRoom = room.status === 'open' || room.status === 'reconnecting' || room.status === 'connecting';
  const isHost = room.role === 'host';
  useEffect(() => {
    if (Game && inRoom) markPlayed(game.id);
  }, [Game, inRoom, game.id]);

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
    <main className={`screen play-screen${settings.clean ? ' clean' : ''}`}>
      <GameBar game={game} turn={turn} onExit={() => setConfirmExit(true)} onRules={() => setShowRules(true)} />

      {room.status === 'reconnecting' && <p className="notice">{t('Connection lost. Reconnecting…')}</p>}

      <CrewContext.Provider value={crew}>
        <TurnContext.Provider value={setTurn}>
          <Game />
        </TurnContext.Provider>
      </CrewContext.Provider>

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
