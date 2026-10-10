import type { CSSProperties } from 'react';
import { GAMES } from '../games/registry';
import { playerRange, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import Intensity from './Intensity';

/** Running number of a game in the line-up: 01, 02, … */
export function gameNumber(game: GameDefinition) {
  return String(GAMES.indexOf(game) + 1).padStart(2, '0');
}

/** A game as a ticket: coloured stub with its number, perforation, then the details. */
export default function GameCard({
  game,
  onOpen,
  tagline = true,
}: {
  game: GameDefinition;
  onOpen: () => void;
  /** The one-line description under the name (the home screen leaves it out). */
  tagline?: boolean;
}) {
  const soon = !game.component && !game.online;
  const players = playerRange(game);
  return (
    <button
      type="button"
      className={`ticket${soon ? ' soon' : ''}`}
      style={{ '--card-bg': game.color } as CSSProperties}
      onClick={() => {
        sfx.pop();
        buzz();
        onOpen();
      }}
    >
      <span className="ticket-stub">
        <span className="ticket-no">{gameNumber(game)}</span>
        <span className="ticket-emoji">{game.emoji}</span>
      </span>
      <span className="ticket-body">
        <span className="ticket-name">{t(game.name)}</span>
        {tagline && <span className="ticket-tagline">{t(game.tagline)}</span>}
        <span className="ticket-meta">
          <span>{t('{n} players', { n: players })}</span>
          <Intensity level={game.intensity} showLabel />
          {game.online && <span className="ticket-flag">{t(game.phones ?? 'Every phone')}</span>}
        </span>
      </span>
      {soon && <span className="stamp">{t('Soon')}</span>}
    </button>
  );
}
