import { useEffect, useState } from 'react';
import BigButton from '../components/BigButton';
import RulesList from '../components/RulesList';
import Sheet from '../components/Sheet';
import TopBar, { RoundButton } from '../components/TopBar';
import type { GameDefinition } from '../games/types';
import { navigate, paths } from '../lib/router';
import { useWakeLock } from '../lib/wakeLock';
import { useApp } from '../state/AppState';

/** Wraps every game: same escape button, same rules button, screen stays awake. */
export default function Play({ game }: { game: GameDefinition }) {
  const { players } = useApp();
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  useWakeLock();

  const Game = game.component;
  const playable = Game && players.length >= game.minPlayers && (game.maxPlayers == null || players.length <= game.maxPlayers);
  const exit = () => navigate(paths.game(game.id));

  useEffect(() => {
    if (!playable) navigate(paths.game(game.id));
  }, [playable, game.id]);

  if (!playable) return null;

  return (
    <main className="screen play-screen">
      <TopBar
        title={`${game.emoji} ${game.name}`}
        onBack={() => setConfirmExit(true)}
        icon="close"
        right={
          <RoundButton label="Rules" color="var(--yellow)" onClick={() => setShowRules(true)}>
            ?
          </RoundButton>
        }
      />

      <Game players={players} exit={exit} />

      <Sheet open={showRules} onClose={() => setShowRules(false)} title={`${game.emoji} How to play`}>
        <RulesList rules={game.rules} />
      </Sheet>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} title="Leave the game? 🥺" closeLabel="NO, KEEP PLAYING 🍻">
        <BigButton color="var(--pink)" onClick={exit}>
          YES, QUIT
        </BigButton>
      </Sheet>
    </main>
  );
}
