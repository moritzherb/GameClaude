import type { CSSProperties } from 'react';
import type { GameDefinition } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import Intensity from './Intensity';

export default function GameCard({ game, onOpen, wide }: { game: GameDefinition; onOpen: () => void; wide?: boolean }) {
  const soon = !game.component && !game.online;
  const players = game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers}` : `${game.minPlayers}+`;
  return (
    <button
      type="button"
      className={`game-card${soon ? ' soon' : ''}${wide ? ' wide' : ''}`}
      style={{ '--card-bg': game.color } as CSSProperties}
      onClick={() => {
        sfx.pop();
        buzz();
        onOpen();
      }}
    >
      {soon && <span className="tag">Soon</span>}
      {game.online && <span className="tag">📱 Every phone</span>}
      <span className="game-card-emoji">{game.emoji}</span>
      <span className="game-card-body">
        <span className="game-card-name">{game.name}</span>
        <span className="game-card-tagline">{game.tagline}</span>
        <span className="game-card-meta">
          <span>{players} players</span>
          <Intensity level={game.intensity} />
        </span>
      </span>
    </button>
  );
}
