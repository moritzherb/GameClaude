import type { CSSProperties } from 'react';
import type { GameDefinition } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import Intensity from './Intensity';

export default function GameCard({ game, index, onOpen }: { game: GameDefinition; index: number; onOpen: () => void }) {
  const soon = !game.component;
  const players = game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers}` : `${game.minPlayers}+`;
  return (
    <button
      type="button"
      className={`game-card${soon ? ' soon' : ''}`}
      style={{ '--card-bg': game.color, '--tilt': `${index % 2 ? 1.2 : -1.2}deg` } as CSSProperties}
      onClick={() => {
        sfx.pop();
        buzz();
        onOpen();
      }}
    >
      {soon && <span className="sticker">SOON</span>}
      <span className="game-card-emoji">{game.emoji}</span>
      <span className="game-card-name">{game.name}</span>
      <span className="game-card-tagline">{game.tagline}</span>
      <span className="game-card-meta">
        <span>👥 {players}</span>
        <Intensity level={game.intensity} />
      </span>
    </button>
  );
}
