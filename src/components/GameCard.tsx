import type { CSSProperties } from 'react';
import { GAMES } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import Intensity from './Intensity';

/** Running number of a game in the line-up: 01, 02, … */
export function gameNumber(game: GameDefinition) {
  return String(GAMES.indexOf(game) + 1).padStart(2, '0');
}

/** A game as a ticket: coloured stub with its number, perforation, then the details. */
export default function GameCard({ game, onOpen }: { game: GameDefinition; onOpen: () => void }) {
  const soon = !game.component && !game.online;
  const players = game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers}` : `${game.minPlayers}+`;
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
        <span className="ticket-name">{game.name}</span>
        <span className="ticket-tagline">{game.tagline}</span>
        <span className="ticket-meta">
          <span>{players} players</span>
          <Intensity level={game.intensity} showLabel />
          {game.online && <span className="ticket-flag">Every phone</span>}
        </span>
      </span>
      {soon && <span className="stamp">Soon</span>}
    </button>
  );
}
