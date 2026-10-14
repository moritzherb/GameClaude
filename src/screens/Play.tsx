import { useEffect, useState } from 'react';
import BigButton from '../components/BigButton';
import { CrewContext } from '../components/Finished';
import GameBar from '../components/GameBar';
import RulesList from '../components/RulesList';
import Sheet from '../components/Sheet';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { markPlayed } from '../lib/recent';
import { TurnContext, type TurnPlayer } from '../lib/turn';
import { navigate, paths } from '../lib/router';
import { useWakeLock } from '../lib/wakeLock';
import { useApp } from '../state/AppState';

/** Wraps every game: same escape button, same rules button, the clean-table switch, screen stays awake. */
export default function Play({ game }: { game: GameDefinition }) {
  const { players, settings } = useApp();
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  // Who's on, named by the game: a bubble in the bar on a clean table.
  const [turn, setTurn] = useState<TurnPlayer | null>(null);
  useWakeLock();

  const Game = game.component;
  const playable = Game && players.length >= game.minPlayers && (game.picksPlayers || game.maxPlayers == null || players.length <= game.maxPlayers);
  // Leaving a game (quit, or Back to games at the end) goes all the way home.
  const exit = () => navigate(paths.home);

  useEffect(() => {
    if (!playable) navigate(paths.game(game.id));
    else markPlayed(game.id);
  }, [playable, game.id]);

  if (!playable) return null;

  return (
    <main className={`screen play-screen${settings.clean ? ' clean' : ''}`}>
      <GameBar game={game} turn={turn} onExit={() => setConfirmExit(true)} onRules={() => setShowRules(true)} />

      <CrewContext.Provider value={players}>
        <TurnContext.Provider value={setTurn}>
          <Game players={players} exit={exit} />
        </TurnContext.Provider>
      </CrewContext.Provider>

      <Sheet open={showRules} onClose={() => setShowRules(false)} title={t('How to play')}>
        <RulesList rules={game.rules} />
      </Sheet>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} title={t('Leave the game?')} closeLabel={t('Keep playing')}>
        <BigButton variant="danger" onClick={exit}>
          {t('Quit game')}
        </BigButton>
      </Sheet>
    </main>
  );
}
