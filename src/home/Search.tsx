import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchIcon } from '../components/Icons';
import { GAMES } from '../games/registry';
import { CATEGORIES, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { useTopTint } from '../lib/useTopTint';
import { GameApp } from './AppIcon';
import { searchGames } from './search';

/** Pushing the search up this far (px), or quickly, puts it away. */
const AWAY = 70;

/**
 * Searching the games the iPhone's way (Spotlight, pulled down over the home screen, the field at
 * the top; Android searches in its drawer). Before typing it suggests the recent games. Pushing it
 * back up puts it away, as on the phone; so do Cancel and Escape.
 */
export default function Search({ suggestions, onClose }: { suggestions: GameDefinition[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  useTopTint(root);

  /** Away upwards and fading (from wherever the finger left it), then gone. */
  const close = useCallback(() => {
    const el = root.current;
    if (leaving.current) return;
    leaving.current = true;
    if (!el) return onClose();
    input.current?.blur();
    el.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.85, 0.25, 1), opacity 0.22s ease';
    el.style.transform = 'translateY(-90px)';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Pushed up with the finger: it follows, and fades; let go far (or fast) enough, it's put away.
  // Not while the results still scroll down (then it's their scroll); nothing scrolls behind it.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let start: { y: number; t: number; on: boolean; dy: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const b = body.current;
      const scrolls = !!b && b.contains(e.target as Node) && b.scrollTop + b.clientHeight < b.scrollHeight - 1;
      start = e.touches.length === 1 && !scrolls ? { y: e.touches[0].clientY, t: Date.now(), on: false, dy: 0 } : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const dy = e.touches[0].clientY - start.y;
      if (!start.on) {
        if (dy > -8) return;
        start.on = true;
        input.current?.blur();
        el.style.transition = 'none';
      }
      e.preventDefault();
      start.dy = Math.min(0, dy + 8);
      el.style.transform = `translateY(${start.dy}px)`;
      el.style.opacity = String(Math.max(0.2, 1 + start.dy / 260));
    };
    const onEnd = () => {
      const s = start;
      start = null;
      if (!s?.on) return;
      const fast = -s.dy / Math.max(1, Date.now() - s.t) > 0.5;
      if (-s.dy > AWAY || fast) return close();
      el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.85, 0.25, 1), opacity 0.25s ease';
      el.style.transform = '';
      el.style.opacity = '';
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [close]);

  const found = searchGames(query, GAMES, (g) => [t(g.name), t(g.tagline), ...g.categories.map((c) => t(CATEGORIES.find((x) => x.id === c)?.label ?? ''))]);
  const shown = query.trim() ? found : suggestions;

  return (
    <div ref={root} className="sheet-backdrop os-search" role="dialog" aria-modal="true" aria-label={t('Search')} onClick={(e) => e.target === e.currentTarget && close()}>
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
        <button type="button" className="os-search-cancel" onClick={close}>
          {t('Cancel')}
        </button>
      </div>
      <div ref={body} className="os-search-body" onClick={(e) => e.target === e.currentTarget && close()}>
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
