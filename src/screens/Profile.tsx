import { useRef, useState, type CSSProperties } from 'react';
import Avatar from '../components/Avatar';
import TopBar from '../components/TopBar';
import { findGame } from '../games/registry';
import { RANK_EMOJI, RANK_NAME } from '../games/arschloch/Arschloch';
import type { Rank } from '../games/arschloch/logic';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { squarePhoto } from '../lib/photo';
import { navigate, paths } from '../lib/router';
import { unfill } from '../lib/noAutofill';
import { loadStats, resetStats } from '../lib/stats';
import { useProfile } from '../net/profile';
import { PLAYER_COLORS } from '../state/AppState';

const RANKS: Rank[] = ['president', 'vice', 'citizen', 'vice-arschloch', 'arschloch'];

/** This phone's own profile: name, photo or emoji, colour (what the others see in a room), and its numbers. */
export default function Profile() {
  const { profile, setName, nextEmoji, setColor, setPhoto } = useProfile();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stats, setStats] = useState(loadStats);
  const [confirmReset, setConfirmReset] = useState(false);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setFailed(false);
    try {
      setPhoto(await squarePhoto(f));
      sfx.pop();
      buzz(15);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const games = Object.entries(stats.played)
    .map(([id, n]) => ({ game: findGame(id), n }))
    .filter((x) => x.game && x.n > 0)
    .sort((a, b) => b.n - a.n);
  const total = games.reduce((sum, x) => sum + x.n, 0);
  const rounds = RANKS.reduce((sum, r) => sum + (stats.ranks[r] ?? 0), 0);

  return (
    <main className="screen profile-page">
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="large-title">{t('Your profile')}</h1>
      <p className="lead">{t('What the others see when you play together in a room. It stays on this phone.')}</p>

      <section className="profile-card">
        <span className={`profile-avatar${busy ? ' busy' : ''}`} style={{ '--chip': profile.color } as CSSProperties}>
          <Avatar avatar={profile.avatar} photo={profile.photo} />
        </span>
        <div className="profile-buttons">
          <button type="button" className="chip" onClick={() => file.current?.click()} disabled={busy}>
            📷 {profile.photo ? t('New photo') : t('Add a photo')}
          </button>
          {profile.photo ? (
            <button type="button" className="chip" onClick={() => setPhoto(undefined)}>
              {t('Remove photo')}
            </button>
          ) : (
            <button type="button" className="chip" onClick={nextEmoji}>
              🎲 {t('Other emoji')}
            </button>
          )}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        {failed && <p className="notice bad">{t('That picture didn’t work. Try another one.')}</p>}

        <label className="me-field profile-name" htmlFor="profile-nick">
          <span className="me-label">{unfill(t('Your name'))}</span>
          <input
            id="profile-nick"
            type="search"
            name="prost-nick"
            className="me-input"
            value={profile.name}
            maxLength={18}
            placeholder={unfill(t('Type your name'))}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="words"
            enterKeyHint="done"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="profile-colors" role="radiogroup" aria-label={t('Colour')}>
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={profile.color === c}
              aria-label={c}
              className={`profile-color${profile.color === c ? ' active' : ''}`}
              style={{ '--chip': c } as CSSProperties}
              onClick={() => {
                setColor(c);
                buzz(8);
              }}
            />
          ))}
        </div>
      </section>

      <h2 className="section-title">{t('Your stats')}</h2>
      <div className="profile-stats">
        <div className="stat-tile">
          <span className="stat-num">{total}</span>
          <span className="stat-label">{t('Games played')}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{games[0] ? games[0].game!.emoji : '–'}</span>
          <span className="stat-label">{games[0] ? t('Favourite: {game}', { game: t(games[0].game!.name) }) : t('Favourite game')}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{stats.sips.drunk}</span>
          <span className="stat-label">{t('Sips drunk')}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{stats.sips.given}</span>
          <span className="stat-label">{t('Sips handed out')}</span>
        </div>
      </div>
      {total === 0 && <p className="fine-print">{t('Play a few games: your numbers show up here.')}</p>}

      {games.length > 0 && (
        <ul className="profile-games">
          {games.slice(0, 5).map(({ game, n }) => (
            <li key={game!.id}>
              <span className="profile-game-emoji">{game!.emoji}</span>
              <span className="profile-game-name">{t(game!.name)}</span>
              <span className="profile-game-n">{t('{n}×', { n })}</span>
            </li>
          ))}
        </ul>
      )}

      {rounds > 0 && (
        <>
          <h2 className="section-title">{t('Arschloch')}</h2>
          <ul className="profile-games">
            {RANKS.filter((r) => stats.ranks[r]).map((r) => (
              <li key={r}>
                <span className="profile-game-emoji">{RANK_EMOJI[r]}</span>
                <span className="profile-game-name">{t(RANK_NAME[r])}</span>
                <span className="profile-game-n">{t('{n}×', { n: stats.ranks[r] })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="fine-print">{t('Sips are counted in the games that know who drinks (Arschloch, so far).')}</p>

      {total > 0 && (
        <button
          type="button"
          className="text-btn profile-reset"
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            resetStats();
            setStats(loadStats());
            setConfirmReset(false);
          }}
        >
          {confirmReset ? t('Tap again to reset your stats') : t('Reset stats')}
        </button>
      )}
    </main>
  );
}
