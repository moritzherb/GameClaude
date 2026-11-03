import { useEffect, useRef } from 'react';
import TopBar from '../components/TopBar';
import { GAMES } from '../games/registry';
import { CATEGORIES, type CategoryId } from '../games/types';
import { GameApp } from '../home/AppIcon';
import { usePlatform } from '../home/usePlatform';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';

/** All games, or one kind of them, like a folder opened on the home screen. */
export default function Library({ category }: { category: CategoryId | null }) {
  const os = usePlatform();
  const games = GAMES.filter((g) => !category || g.categories.includes(category));
  const current = CATEGORIES.find((c) => c.id === category);

  // Bring the picked category into view. Only the strip scrolls: scrollIntoView would also move
  // the whole page on iPhones.
  const strip = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.scrollTo(0, 0);
    const box = strip.current;
    const on = box?.querySelector<HTMLElement>('.chip.active');
    if (!box || !on) return;
    const left = on.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + on.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: left - (box.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [category]);

  const chip = (id: CategoryId | null, label: string) => (
    <button
      key={id ?? 'all'}
      type="button"
      className={`chip${category === id ? ' active' : ''}`}
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
    <main className={`screen os-folder ${os}`}>
      <div className="wallpaper" aria-hidden />
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="os-folder-title">{current ? t(current.label) : t('All games')}</h1>
      <div className="chips" ref={strip}>
        {chip(null, t('All'))}
        {CATEGORIES.map((c) => chip(c.id, t(c.label)))}
      </div>
      <div className="os-folder-panel" ref={panel}>
        <div className="os-grid">
          {games.map((g) => (
            <GameApp key={g.id} game={g} />
          ))}
        </div>
      </div>
    </main>
  );
}
