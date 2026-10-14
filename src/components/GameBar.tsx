import type { CSSProperties } from 'react';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import type { TurnPlayer } from '../lib/turn';
import { useApp } from '../state/AppState';
import Avatar from './Avatar';
import { CleanIcon, HelpIcon, UncleanIcon } from './Icons';
import TopBar, { RoundButton } from './TopBar';

/**
 * The bar over every game: quit on the left, the game's name, the rules and the clean-table switch.
 * With a clean table it's just the two small buttons (quit and the switch back) and, between them, a
 * small bubble with who's on (the game's own line saying so is hidden): the game gets the rest.
 */
export default function GameBar({
  game,
  turn,
  onExit,
  onRules,
}: {
  game: GameDefinition;
  turn: TurnPlayer | null;
  onExit: () => void;
  onRules: () => void;
}) {
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
      title={
        clean ? (
          turn && (
            <span key={turn.name} className="turn-bubble" style={{ '--chip': turn.color } as CSSProperties} aria-live="polite">
              <span className="turn-bubble-avatar">
                <Avatar avatar={turn.avatar} photo={turn.photo} />
              </span>
              <span className="turn-bubble-name">{turn.name}</span>
            </span>
          )
        ) : (
          `${game.emoji} ${t(game.name)}`
        )
      }
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
