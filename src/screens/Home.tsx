import { useEffect, useRef, useState, type CSSProperties } from 'react';
import GameCard from '../components/GameCard';
import { ChevronIcon, PlusIcon, SettingsIcon } from '../components/Icons';
import Logo from '../components/Logo';
import Tap from '../components/Tap';
import { RoundButton } from '../components/TopBar';
import { GAMES, playableGames } from '../games/registry';
import { CATEGORIES, type GameDefinition } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import { pick } from '../lib/random';
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

  const featured = [...GAMES].sort((a, b) => Number(!a.component && !a.online) - Number(!b.component && !b.online)).slice(0, 8);

  return (
    <main className="screen home">
      <header className="home-header">
        <Logo />
        <RoundButton label="Settings" onClick={() => navigate(paths.settings)}>
          <SettingsIcon />
        </RoundButton>
      </header>

      <h1 className="headline fade-up">
        Let’s get this <span className="mark">party</span> started.
      </h1>

      <Tap className="players-card fade-up" onClick={() => navigate(paths.players())}>
        {players.length ? (
          <span className="avatar-stack">
            {players.slice(0, 5).map((p) => (
              <span key={p.id} style={{ background: p.color }}>
                {p.avatar}
              </span>
            ))}
            {players.length > 5 && <span className="more">+{players.length - 5}</span>}
          </span>
        ) : (
          <span className="players-card-icon">
            <PlusIcon />
          </span>
        )}
        <span className="players-card-text">
          <span className="players-card-title">{players.length ? `${players.length} players` : 'Add players'}</span>
          <span className="players-card-sub">{players.length ? 'Tap to edit the squad' : 'Who’s playing tonight?'}</span>
        </span>
        <span className="players-card-chevron">
          <ChevronIcon />
        </span>
      </Tap>

      <Tap className={`players-card together-card fade-up${inRoom ? ' live' : ''}`} onClick={() => navigate(paths.room)}>
        <span className="players-card-icon together-icon">📱</span>
        <span className="players-card-text">
          <span className="players-card-title">{inRoom ? `In room ${room.code}` : 'Play together'}</span>
          <span className="players-card-sub">
            {inRoom ? `${room.members.filter((m) => m.online).length} phones connected` : 'Connect everyone’s phones with a QR code'}
          </span>
        </span>
        <span className="players-card-chevron">
          <ChevronIcon />
        </span>
      </Tap>

      <Tap className="hero-card fade-up" onClick={randomGame}>
        <span className="hero-card-emoji">🎲</span>
        <span className="hero-card-kicker">Can’t decide?</span>
        <span className="hero-card-title">Random game</span>
        <span className="hero-card-cta">Spin it</span>
      </Tap>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Games</h2>
          <button type="button" className="link-btn" onClick={() => navigate(paths.games())}>
            See all
          </button>
        </div>
        <div className="carousel">
          {featured.map((g) => (
            <GameCard key={g.id} game={g} onOpen={() => navigate(paths.game(g.id))} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Moods</h2>
        <div className="mood-grid">
          {CATEGORIES.map((c) => (
            <Tap key={c.id} className="mood-tile" style={{ '--card-bg': c.color } as CSSProperties} onClick={() => navigate(paths.games(c.id))}>
              <span className="mood-emoji">{c.emoji}</span>
              <span className="mood-label">{c.label}</span>
            </Tap>
          ))}
        </div>
      </section>

      <p className="fine-print center">Drink responsibly · Water counts as a sip 💧</p>

      {rolling && (
        <div className="roulette-overlay">
          <div className="roulette-card" style={{ '--card-bg': rolling.color } as CSSProperties}>
            <div className="roulette-emoji">{rolling.emoji}</div>
            <div className="roulette-name">{rolling.name}</div>
          </div>
          <div className="roulette-caption">Picking your game…</div>
        </div>
      )}
    </main>
  );
}
