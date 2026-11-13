import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SearchIcon } from '../components/Icons';
import { GAMES } from '../games/registry';
import { CATEGORIES } from '../games/types';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { launch } from '../lib/launch';
import { navigate, paths } from '../lib/router';
import { useTopTint } from '../lib/useTopTint';
import { GameGlyph, glyphsOf, IconArt } from './AppIcon';
import { searchGames } from './search';

/**
 * The App Library's own search, as on the iPhone: not Spotlight (pulled down over the blurred home
 * screen) but the library itself turning into one list of every game, A to Z under its letters,
 * the field at the top narrowing it as you type.
 */
export default function LibrarySearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useTopTint(root);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = [...GAMES].sort((a, b) => t(a.name).localeCompare(t(b.name)));
  const shown = query.trim()
    ? searchGames(query, sorted, (g) => [t(g.name), t(g.tagline), ...g.categories.map((c) => t(CATEGORIES.find((x) => x.id === c)?.label ?? ''))])
    : sorted;
  // Under their first letter (while not searching; a search lists what it found, best first).
  const letter = (name: string) => {
    const c = name.trim().charAt(0).toLocaleUpperCase();
    return /\p{L}/u.test(c) ? c.normalize('NFD').charAt(0) : '#';
  };

  return (
    <div ref={root} className="lib-search" role="dialog" aria-modal="true" aria-label={t('App Library')}>
      <div className="lib-search-bar">
        <label className="lib-search-field">
          <SearchIcon />
          <input
            ref={input}
            type="search"
            value={query}
            placeholder={t('App Library')}
            autoComplete="off"
            enterKeyHint="search"
            aria-label={t('Search games')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="button" className="lib-search-cancel" onClick={onClose}>
          {t('Cancel')}
        </button>
      </div>
      <div className="lib-search-list">
        {shown.map((g, i) => {
          const head = !query.trim() && (i === 0 || letter(t(shown[i - 1].name)) !== letter(t(g.name)));
          return (
            <div key={g.id} className="lib-search-item">
              {head && <span className="lib-search-letter">{letter(t(g.name))}</span>}
              <button
                type="button"
                className="lib-search-row"
                style={{ '--c': g.color } as CSSProperties}
                onClick={(e) => {
                  sfx.pop();
                  buzz();
                  launch(e.currentTarget.querySelector('.app-icon'), g, () => navigate(paths.game(g.id)), glyphsOf(g));
                }}
              >
                <IconArt color={g.color}>
                  <GameGlyph game={g} />
                </IconArt>
                <span className="lib-search-name">{t(g.name)}</span>
              </button>
            </div>
          );
        })}
        {!shown.length && <p className="lib-search-none">{t('No game called “{q}”', { q: query.trim() })}</p>}
      </div>
    </div>
  );
}
