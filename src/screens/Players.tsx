import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import BigButton from '../components/BigButton';
import TopBar from '../components/TopBar';
import { buzz, sfx } from '../lib/fx';
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
    const t = setTimeout(() => setArmClear(false), 3000);
    return () => clearTimeout(t);
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
      <TopBar title="👥 Players" onBack={done} />

      <form className="add-player" onSubmit={submit}>
        <input
          ref={input}
          className="add-player-input"
          value={name}
          maxLength={18}
          placeholder={full ? 'Party’s full! 🎉' : 'Type a name…'}
          disabled={full}
          enterKeyHint="done"
          autoComplete="off"
          autoCapitalize="words"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="add-player-btn" aria-label="Add player" disabled={full}>
          +
        </button>
      </form>
      {duplicate && name.trim() && <p className="warn">Already playing! Pick a nickname 😜</p>}

      {players.length === 0 ? (
        <div className="empty">
          <div className="mega-emoji wobble">🦗</div>
          <p className="big-text">It’s quiet in here… add the squad!</p>
        </div>
      ) : (
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className="player-row pop-in" style={{ '--chip': p.color } as CSSProperties}>
              <button
                type="button"
                className="player-avatar"
                aria-label={`New avatar for ${p.name}`}
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
                aria-label={`Remove ${p.name}`}
                onClick={() => {
                  sfx.boo();
                  buzz(30);
                  removePlayer(p.id);
                }}
              >
                ✕
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
          {armClear ? 'Tap again to kick everyone 💥' : '🗑️ Remove everyone'}
        </button>
      )}

      <div className="sticky-action">
        <BigButton color="var(--lime)" size="xl" onClick={done}>
          {next ? 'READY! →' : 'DONE ✓'}
        </BigButton>
      </div>
    </main>
  );
}
