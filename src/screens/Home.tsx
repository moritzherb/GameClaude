import { useEffect, useRef, useState } from 'react';
import BigButton from '../components/BigButton';
import Logo from '../components/Logo';
import Ticker from '../components/Ticker';
import TopBar, { RoundButton } from '../components/TopBar';
import { GAMES, playableGames } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { buzz, sfx } from '../lib/fx';
import { pick } from '../lib/random';
import { navigate, paths } from '../lib/router';
import { useApp } from '../state/AppState';

export default function Home() {
  const { players } = useApp();
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

  return (
    <main className="screen home">
      <TopBar
        right={
          <RoundButton label="Settings" onClick={() => navigate(paths.settings)}>
            ⚙️
          </RoundButton>
        }
      />

      <section className="home-hero">
        <Logo />
        <p className="home-sub">drinking games for absolute legends</p>
      </section>

      <button type="button" className="player-strip" onClick={() => navigate(paths.players())}>
        {players.length ? (
          <>
            <span className="player-strip-avatars">
              {players.slice(0, 8).map((p) => (
                <span key={p.id} style={{ background: p.color }}>
                  {p.avatar}
                </span>
              ))}
              {players.length > 8 && <span className="more">+{players.length - 8}</span>}
            </span>
            <span className="player-strip-label">{players.length} players ✏️</span>
          </>
        ) : (
          <span className="player-strip-label">👥 Who’s playing? Tap to add players</span>
        )}
      </button>

      <nav className="home-actions">
        <BigButton color="var(--yellow)" size="xl" tilt="left" onClick={randomGame}>
          🎲 RANDOM GAME
        </BigButton>
        <BigButton color="var(--pink)" size="xl" tilt="right" onClick={() => navigate(paths.games())}>
          📚 ALL GAMES
        </BigButton>
        <div className="row-2">
          <BigButton color="var(--orange)" onClick={() => navigate(paths.games('pregame'))}>
            🔥 PREGAME
          </BigButton>
          <BigButton color="var(--cyan)" onClick={() => navigate(paths.games('party'))}>
            🎉 PARTY
          </BigButton>
        </div>
      </nav>

      <Ticker />

      {rolling && (
        <div className="roulette-overlay">
          <div className="roulette-card" style={{ background: rolling.color }}>
            <div className="roulette-emoji">{rolling.emoji}</div>
            <div className="roulette-name">{rolling.name}</div>
          </div>
          <div className="roulette-caption">Choosing your fate…</div>
        </div>
      )}
    </main>
  );
}
