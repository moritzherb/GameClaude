import type { CSSProperties } from 'react';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import type { TurnPlayer } from '../lib/turn';
import { useApp } from '../state/AppState';
import Avatar from './Avatar';
import { CleanIcon, HelpIcon, PeopleIcon, UncleanIcon } from './Icons';
import TopBar, { RoundButton } from './TopBar';

/** Whether a game shows with a clean table: always, never, or as the players' switch says. */
export const isClean = (game: GameDefinition, setting: boolean | undefined) => (game.table ? game.table === 'clean' : !!setting);

/**
 * The bar over every game: quit on the left, the game's name, the rules and the clean-table switch.
 * With a clean table it's just the two small buttons (quit and the switch back) and, between them, a
 * small bubble with who's on (the game's own line saying so is hidden): the game gets the rest.
 * A game that's always clean has the rules there instead of the switch; on a setup screen (nothing
 * a clean table would change) there's no switch either.
 */
export default function GameBar({
  game,
  turn,
  playing,
  onExit,
  onRules,
  onCrew,
}: {
  game: GameDefinition;
  turn: TurnPlayer | null;
  playing: boolean;
  onExit: () => void;
  onRules: () => void;
  /** The crew, to add someone mid-game (one-phone games; a room has its own). */
  onCrew?: () => void;
}) {
  const { settings, updateSettings } = useApp();
  const clean = isClean(game, settings.clean);
  const switchable = !game.table && playing;
  const rules = (
    <RoundButton label={t('Rules')} onClick={onRules}>
      <HelpIcon />
    </RoundButton>
  );
  const crew = onCrew && (
    <RoundButton label={t('The crew')} onClick={onCrew}>
      <PeopleIcon />
    </RoundButton>
  );
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
          // Just the name: the game's own emoji is its icon on the home screen, not a label.
          t(game.name)
        )
      }
      onBack={onExit}
      icon="close"
      right={
        clean ? (
          <>
            {crew}
            {switchable ? toggle : rules}
          </>
        ) : (
          <>
            {crew}
            {switchable && toggle}
            {rules}
          </>
        )
      }
    />
  );
}
