import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { useApp } from '../state/AppState';
import { CleanIcon, HelpIcon, UncleanIcon } from './Icons';
import TopBar, { RoundButton } from './TopBar';

/**
 * The bar over every game: quit on the left, the game's name, the rules and the clean-table switch.
 * With a clean table it's just the two small buttons (quit and the switch back): the game gets the
 * rest of the screen.
 */
export default function GameBar({ game, onExit, onRules }: { game: GameDefinition; onExit: () => void; onRules: () => void }) {
  const { settings, updateSettings } = useApp();
  const clean = !!settings.clean;
  const toggle = (
    <RoundButton label={clean ? t('Show everything') : t('Clean table')} onClick={() => updateSettings({ clean: !clean })}>
      {clean ? <UncleanIcon /> : <CleanIcon />}
    </RoundButton>
  );
  return (
    <TopBar
      className="game-bar"
      title={clean ? undefined : `${game.emoji} ${t(game.name)}`}
      onBack={onExit}
      icon="close"
      right={
        clean ? (
          toggle
        ) : (
          <>
            {toggle}
            <RoundButton label={t('Rules')} onClick={onRules}>
              <HelpIcon />
            </RoundButton>
          </>
        )
      }
    />
  );
}
