import type { CSSProperties } from 'react';
import GameCard from '../components/GameCard';
import TopBar from '../components/TopBar';
import { GAMES } from '../games/registry';
import { CATEGORIES, type CategoryId } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';

export default function Library({ category }: { category: CategoryId | null }) {
  // Playable games first, "coming soon" ones after.
  const games = GAMES.filter((g) => !category || g.categories.includes(category)).sort(
    (a, b) => Number(!a.component) - Number(!b.component),
  );
  const current = CATEGORIES.find((c) => c.id === category);

  const chip = (id: CategoryId | null, label: string, color: string) => (
    <button
      key={id ?? 'all'}
      type="button"
      className={`chip${category === id ? ' active' : ''}`}
      style={{ '--chip': color } as CSSProperties}
      onClick={() => {
        sfx.pop();
        buzz();
        navigate(paths.games(id ?? undefined));
      }}
    >
      {label}
    </button>
  );

  return (
    <main className="screen">
      <TopBar title={current ? `${current.emoji} ${current.label}` : '📚 All Games'} onBack={() => navigate(paths.home)} icon="home" />

      <div className="chips">
        {chip(null, '✨ All', 'var(--white)')}
        {CATEGORIES.map((c) => chip(c.id, `${c.emoji} ${c.label}`, c.color))}
      </div>

      <div className="game-grid">
        {games.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} onOpen={() => navigate(paths.game(g.id))} />
        ))}
        <div className="game-card placeholder">
          <span className="game-card-emoji">🔜</span>
          <span className="game-card-name">More games incoming</span>
          <span className="game-card-tagline">Hydrate while you wait 💧</span>
        </div>
      </div>
    </main>
  );
}
