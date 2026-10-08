import { useState } from 'react';
import BigButton from '../components/BigButton';
import { HelpIcon } from '../components/Icons';
import RulesList from '../components/RulesList';
import Sheet from '../components/Sheet';
import TopBar, { RoundButton } from '../components/TopBar';
import type { GameDefinition } from '../games/types';
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
          <h1 className="bd-title">{game.name} needs a room</h1>
          <p className="lead">Every player uses their own phone. Open a room, let everyone join, then start the game from there.</p>
        </div>
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => navigate(paths.room)}>
            Open Play together
          </BigButton>
        </div>
      </main>
    );
  }

  return (
    <main className="screen play-screen">
      <TopBar
        title={`${game.emoji} ${game.name}`}
        onBack={() => (isHost ? setConfirmExit(true) : navigate(paths.home))}
        icon="close"
        right={
          <RoundButton label="Rules" onClick={() => setShowRules(true)}>
            <HelpIcon />
          </RoundButton>
        }
      />

      {room.status === 'reconnecting' && <p className="notice">Connection lost. Reconnecting…</p>}

      <Game />

      <Sheet open={showRules} onClose={() => setShowRules(false)} title="How to play">
        <RulesList rules={game.rules} />
      </Sheet>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} title="End the game for everyone?" closeLabel="Keep playing">
        <BigButton
          variant="danger"
          onClick={() => {
            room.endGame();
            navigate(paths.room);
          }}
        >
          End game
        </BigButton>
      </Sheet>
    </main>
  );
}
