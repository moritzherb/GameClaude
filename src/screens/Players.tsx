import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import BigButton from '../components/BigButton';
import { CloseIcon, PlusIcon } from '../components/Icons';
import TopBar from '../components/TopBar';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { unfill } from '../lib/noAutofill';
import { navigate, paths } from '../lib/router';
import { MAX_PLAYERS, useApp } from '../state/AppState';

export default function Players({ next }: { next: string | null }) {
  const { players, addPlayer, removePlayer, rerollAvatar, clearPlayers } = useApp();
  const [name, setName] = useState('');
  const [armClear, setArmClear] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const full = players.length >= MAX_PLAYERS;
  const duplicate = players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  useEffect(() => {
    if (!armClear) return;
    const timeout = setTimeout(() => setArmClear(false), 3000);
    return () => clearTimeout(timeout);
  }, [armClear]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || full || duplicate) {
      sfx.boo();
      buzz([30, 40, 30]);
      return;
    }
    sfx.pop();
    buzz();
    addPlayer(name);
    setName('');
    input.current?.focus();
  };

  const done = () => navigate(next ?? paths.home);

  return (
    <main className="screen">
      <TopBar onBack={done} />
      <h1 className="large-title">{t('Players')}</h1>

      <form className="add-player" onSubmit={submit}>
        <input
          ref={input}
          className="add-player-input"
          type="search"
          name="prost-player"
          value={name}
          maxLength={18}
          placeholder={full ? t('Party’s full') : unfill(t('Add a name'))}
          disabled={full}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="words"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="add-player-btn" aria-label={t('Add player')} disabled={full}>
          <PlusIcon />
        </button>
      </form>
      {duplicate && name.trim() && <p className="warn">{t('Already playing. Try a nickname.')}</p>}

      {players.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🦗</div>
          <p className="lead">{t('It’s quiet in here. Add the squad.')}</p>
        </div>
      ) : (
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className="player-row pop-in" style={{ '--chip': p.color } as CSSProperties}>
              <button
                type="button"
                className="player-avatar"
                aria-label={t('New avatar for {name}', { name: p.name })}
                onClick={() => {
                  sfx.pop();
                  buzz();
                  rerollAvatar(p.id);
                }}
              >
                {p.avatar}
              </button>
              <span className="player-name">{p.name}</span>
              <button
                type="button"
                className="player-remove"
                aria-label={t('Remove {name}', { name: p.name })}
                onClick={() => {
                  sfx.boo();
                  buzz(30);
                  removePlayer(p.id);
                }}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {players.length > 1 && (
        <button
          type="button"
          className={`text-btn${armClear ? ' danger' : ''}`}
          onClick={() => {
            buzz();
            if (armClear) {
              clearPlayers();
              setArmClear(false);
            } else setArmClear(true);
          }}
        >
          {armClear ? t('Tap again to remove everyone') : t('Remove everyone')}
        </button>
      )}

      <div className="sticky-action">
        <BigButton size="xl" onClick={done}>
          {next ? t('Ready') : t('Done')}
        </BigButton>
      </div>
    </main>
  );
}
