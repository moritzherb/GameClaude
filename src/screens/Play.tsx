import { useEffect, useState } from 'react';
import BigButton from '../components/BigButton';
import { HelpIcon } from '../components/Icons';
import RulesList from '../components/RulesList';
import Sheet from '../components/Sheet';
import TopBar, { RoundButton } from '../components/TopBar';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
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
        title={`${game.emoji} ${t(game.name)}`}
        onBack={() => setConfirmExit(true)}
        icon="close"
        right={
          <RoundButton label={t('Rules')} onClick={() => setShowRules(true)}>
            <HelpIcon />
          </RoundButton>
        }
      />

      <Game players={players} exit={exit} />

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
