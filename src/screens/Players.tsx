import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import BigButton from '../components/BigButton';
import { CloseIcon, PlusIcon } from '../components/Icons';
import TopBar from '../components/TopBar';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { unfill } from '../lib/noAutofill';
import { navigate, paths } from '../lib/router';
import Sheet from '../components/Sheet';
import { AVATARS, MAX_PLAYERS, useApp, type Player } from '../state/AppState';

export default function Players({ next }: { next: string | null }) {
  const { players, addPlayer, removePlayer, updatePlayer, clearPlayers } = useApp();
  // The player whose avatar is being picked (the sheet with all avatars).
  const [picking, setPicking] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [armClear, setArmClear] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Only a player added now pops in; the ones already there just show (a long list popping at once is heavy).
  const [listed] = useState(() => new Set(players.map((p) => p.id)));
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
          aria-label={t('Add player')}
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
            <li key={p.id} className={`player-row${listed.has(p.id) ? '' : ' pop-in'}`} style={{ '--chip': p.color } as CSSProperties}>
              <button
                type="button"
                className="player-avatar"
                aria-label={t('Change avatar of {name}', { name: p.name })}
                onClick={() => {
                  sfx.pop();
                  buzz();
                  setPicking(p);
                }}
              >
                {p.avatar}
              </button>
              <PlayerName
                player={p}
                taken={(n) => players.some((o) => o.id !== p.id && o.name.toLowerCase() === n.toLowerCase())}
                onRename={(n) => updatePlayer(p.id, { name: n })}
              />
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

      <Sheet
        open={!!picking}
        onClose={() => setPicking(null)}
        title={picking ? t('Pick an avatar for {name}', { name: picking.name }) : ''}
        closeLabel={t('Cancel')}
      >
        <div className="avatar-grid">
          {AVATARS.map((a) => {
            const mine = a === picking?.avatar;
            // Someone else has it already (still free to pick: it's just a hint).
            const used = !mine && players.some((o) => o.avatar === a);
            return (
              <button
                key={a}
                type="button"
                className={`avatar-choice${mine ? ' on' : ''}${used ? ' used' : ''}`}
                style={picking ? ({ '--chip': picking.color } as CSSProperties) : undefined}
                aria-pressed={mine}
                onClick={() => {
                  if (!picking) return;
                  sfx.pop();
                  buzz();
                  updatePlayer(picking.id, { avatar: a });
                  setPicking(null);
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </Sheet>

      <div className="sticky-action">
        <BigButton size="xl" onClick={done}>
          {next ? t('Ready') : t('Done')}
        </BigButton>
      </div>
    </main>
  );
}

/** A player's name, changed right where it stands: tap it and type. Empty or taken names don't stick. */
function PlayerName({ player, taken, onRename }: { player: Player; taken: (name: string) => boolean; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(player.name);
  const cancelled = useRef(false);
  useEffect(() => setDraft(player.name), [player.name]);
  const clean = draft.trim();
  const clash = !!clean && clean.toLowerCase() !== player.name.toLowerCase() && taken(clean);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(player.name);
      return;
    }
    if (!clean || clash) {
      if (clean !== player.name) {
        sfx.boo();
        buzz([30, 40, 30]);
      }
      setDraft(player.name);
      return;
    }
    if (clean !== player.name) {
      sfx.pop();
      buzz();
      onRename(clean);
    }
    setDraft(clean);
  };

  return (
    <span className="player-name">
      <input
        className={`player-name-input${clash ? ' clash' : ''}`}
        type="search"
        name="prost-player-name"
        aria-label={t('Rename {name}', { name: player.name })}
        value={draft}
        maxLength={18}
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="words"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.setSelectionRange(0, e.currentTarget.value.length)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
      />
      {clash && <span className="player-name-warn">{t('Already playing. Try a nickname.')}</span>}
    </span>
  );
}
