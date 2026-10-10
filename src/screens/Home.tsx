import { useEffect, useRef, useState, type CSSProperties } from 'react';
import GameCard from '../components/GameCard';
import { ChevronIcon, PlusIcon, SettingsIcon } from '../components/Icons';
import Logo from '../components/Logo';
import Tap from '../components/Tap';
import { RoundButton } from '../components/TopBar';
import { findGame, GAMES, playableGames } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import { getLang, t } from '../i18n';
import { headlineFor } from '../lib/headline';
import { pick } from '../lib/random';
import { recentGames } from '../lib/recent';
import { lineup } from '../lib/lineup';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

export default function Home() {
  const { players } = useApp();
  const room = useRoom();
  const inRoom = room.status === 'open' || room.status === 'reconnecting';
  const [rolling, setRolling] = useState<GameDefinition | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  // The headline follows the night, so check the clock every minute while home is open.
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const clock = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(clock);
  }, []);
  const lang = getLang();
  const headline = headlineFor(hour, lang);

  const randomGame = () => {
    const pool = playableGames();
    if (!pool.length) return navigate(paths.games());
    const target = pick(pool);
    const showcase = GAMES.length > 1 ? GAMES : pool;
    let n = 0;
    setRolling(pick(showcase));
    timer.current = window.setInterval(() => {
      n++;
      sfx.tick();
      buzz(5);
      if (n >= 14) {
        window.clearInterval(timer.current);
        setRolling(target);
        setTimeout(() => {
          setRolling(null);
          navigate(paths.game(target.id));
        }, 650);
      } else {
        setRolling(pick(showcase));
      }
    }, 90);
  };

  // The last three games played on this phone, newest first.
  const [recent] = useState(() => recentGames().map(findGame).filter((g): g is GameDefinition => !!g));

  // A few playable games, drawn at random every few hours.
  const [featured] = useState(() =>
    lineup(GAMES.filter((g) => g.component || g.online).map((g) => g.id))
      .map(findGame)
      .filter((g): g is GameDefinition => !!g),
  );

  // "Fri 09.10" / "Fr. 09.10"
  const date = new Date()
    .toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .replace(',', '')
    .replace('/', '.')
    .replace(/\.$/, '');

  return (
    <main className="screen home">
      <header className="home-header">
        <Logo />
        <span className="home-date">{date}</span>
        <RoundButton label={t('Settings')} onClick={() => navigate(paths.settings)}>
          <SettingsIcon />
        </RoundButton>
      </header>

      <h1 className="poster-title fade-up">
        {headline.top} <span className="hl">{headline.sticker}</span>
      </h1>

      <Tap className="crew fade-up" onClick={() => navigate(paths.players())}>
        <span className="crew-count">{players.length || <PlusIcon />}</span>
        <span className="crew-text">
          <span className="crew-label">{t('The crew')}</span>
          <span className="crew-sub">{players.length ? t('Tap to edit') : t('Who’s playing tonight?')}</span>
        </span>
        {players.length > 0 && (
          <span className="avatar-stack">
            {players.slice(0, 4).map((p) => (
              <span key={p.id} style={{ background: p.color }}>
                {p.avatar}
              </span>
            ))}
            {players.length > 4 && <span className="more">+{players.length - 4}</span>}
          </span>
        )}
        <span className="crew-chevron">
          <ChevronIcon />
        </span>
      </Tap>

      <div className="quick-row fade-up">
        <Tap className="quick quick-shuffle" onClick={randomGame}>
          <span className="quick-icon" aria-hidden>
            🎲
          </span>
          <span className="quick-title">{t('Shuffle')}</span>
          <span className="quick-sub">{t('We pick, you play')}</span>
        </Tap>
        <Tap className={`quick quick-room${inRoom ? ' live' : ''}`} onClick={() => navigate(paths.room)}>
          <span className="quick-icon" aria-hidden>
            📱
          </span>
          <span className="quick-title">{inRoom ? room.code : t('Together')}</span>
          <span className="quick-sub">
            {inRoom ? t('{n} phones live', { n: room.members.filter((m) => m.online).length }) : t('Every phone joins')}
          </span>
        </Tap>
      </div>

      {recent.length > 0 && (
        <section className="section fade-up">
          <div className="section-head">
            <h2 className="section-title">{t('Last played')}</h2>
          </div>
          <div className="recent-row">
            {recent.map((g) => (
              <Tap
                key={g.id}
                className="recent-tile"
                style={{ '--card-bg': g.color } as CSSProperties}
                ariaLabel={t(g.name)}
                onClick={() => navigate(paths.game(g.id))}
              >
                <span className="recent-emoji" aria-hidden>
                  {g.emoji}
                </span>
              </Tap>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t('The line-up')}</h2>
          <button type="button" className="link-btn" onClick={() => navigate(paths.games())}>
            {t('All games')}
          </button>
        </div>
        <div className="ticket-list">
          {featured.map((g) => (
            <GameCard key={g.id} game={g} onOpen={() => navigate(paths.game(g.id))} />
          ))}
        </div>
      </section>

      {rolling && (
        <div className="roulette-overlay">
          <div className="roulette-card" style={{ '--card-bg': rolling.color } as CSSProperties}>
            <div className="roulette-emoji">{rolling.emoji}</div>
            <div className="roulette-name">{t(rolling.name)}</div>
          </div>
          <div className="roulette-caption">{t('Picking your game…')}</div>
        </div>
      )}
    </main>
  );
}
