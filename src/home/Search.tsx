import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from '../components/Icons';
import { GAMES } from '../games/registry';
import { CATEGORIES, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { GameApp } from './AppIcon';
import { searchGames } from './search';

/**
 * Searching the games, the phone's way: Spotlight on an iPhone (pulled over the home screen, the
 * field at the top), the search bar on Android. Before typing it suggests the recent games.
 * Escape (and the Android back button) closes it.
 */
export default function Search({ suggestions, onClose }: { suggestions: GameDefinition[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const found = searchGames(query, GAMES, (g) => [t(g.name), t(g.tagline), ...g.categories.map((c) => t(CATEGORIES.find((x) => x.id === c)?.label ?? ''))]);
  const shown = query.trim() ? found : suggestions;

  return (
    <div className="sheet-backdrop os-search" role="dialog" aria-modal="true" aria-label={t('Search')} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="os-search-bar">
        <label className="os-search-field">
          <SearchIcon />
          <input
            ref={input}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t('Search games')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="button" className="os-search-cancel" onClick={onClose}>
          {t('Cancel')}
        </button>
      </div>
      <div className="os-search-body" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <h2 className="os-search-h">{query.trim() ? t('Games') : t('Suggestions')}</h2>
        {shown.length ? (
          <div className="os-grid">
            {shown.map((g) => (
              <GameApp key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <p className="os-search-none">{t('No game called “{q}”', { q: query.trim() })}</p>
        )}
      </div>
    </div>
  );
}
