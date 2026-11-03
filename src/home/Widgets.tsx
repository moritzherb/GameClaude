import type { CSSProperties } from 'react';
import AppDie from '../components/AppDie';
import Avatar from '../components/Avatar';
import Tap from '../components/Tap';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { launch } from '../lib/launch';
import { navigate, paths } from '../lib/router';
import type { Player } from '../state/AppState';
import { GameGlyph } from './AppIcon';

/** The crew's faces, overlapping a little. */
function Faces({ players }: { players: Player[] }) {
  const shown = players.slice(0, 4);
  return (
    <span className="w-faces">
      {shown.length ? (
        shown.map((p) => (
          <span key={p.id} className="w-face" style={{ '--f': p.color } as CSSProperties}>
            <Avatar avatar={p.avatar} photo={p.photo} />
          </span>
        ))
      ) : (
        <span className="w-face empty">+</span>
      )}
    </span>
  );
}

/** Who plays tonight: their faces and how many. Opens the crew. */
export function CrewWidget({ players }: { players: Player[] }) {
  return (
    <Tap className="widget w-crew" onClick={() => navigate(paths.players())} ariaLabel={t('The crew')}>
      <Faces players={players} />
      <span className="w-title">{t('The crew')}</span>
      <span className="w-sub">{players.length ? t('{n} players', { n: players.length }) : t('Who’s playing tonight?')}</span>
    </Tap>
  );
}

/** Android: the crew next to the date, as a small pill. */
export function CrewChip({ players }: { players: Player[] }) {
  return (
    <Tap className="w-crewchip" onClick={() => navigate(paths.players())} ariaLabel={`${t('The crew')}: ${t('{n} players', { n: players.length })}`}>
      <Faces players={players} />
      <b>{players.length || '+'}</b>
    </Tap>
  );
}

/** The game played last, to jump back in; before the first game, the shuffle. */
export function LastWidget({ game, onShuffle }: { game: GameDefinition | null; onShuffle: () => void }) {
  if (!game) {
    return (
      <Tap className="widget w-last w-shuffle" onClick={onShuffle} ariaLabel={t('Shuffle')}>
        <span className="w-pop" aria-hidden>
          <AppDie size={58} />
        </span>
        <span className="w-kicker">{t('Shuffle')}</span>
        <span className="w-title">{t('We pick, you play')}</span>
      </Tap>
    );
  }
  return (
    <Tap
      className="widget w-last"
      style={{ '--c': game.color } as CSSProperties}
      ariaLabel={`${t('Last played')}: ${t(game.name)}`}
      onClick={(e) => launch(e.currentTarget.querySelector('.w-pop'), game, () => navigate(paths.game(game.id)))}
    >
      <span className="w-kicker">{t('Last played')}</span>
      <span className="w-pop" aria-hidden>
        <GameGlyph game={game} />
      </span>
      <span className="w-title">{t(game.name)}</span>
    </Tap>
  );
}

/** A Material "cookie": a circle with nine soft bumps, as a clip-path. */
const COOKIE = `polygon(${Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const r = 46 + 4 * Math.cos(9 * a);
  return `${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`;
}).join(', ')})`;

/** Android: the shuffle on a cookie shape. */
export function CookieWidget({ onShuffle }: { onShuffle: () => void }) {
  return (
    <Tap className="w-cookie" onClick={onShuffle} ariaLabel={t('Shuffle')}>
      <span className="w-cookie-shape" style={{ clipPath: COOKIE }} aria-hidden />
      <span className="w-cookie-in">
        <b aria-hidden>🎲</b>
        {t('Shuffle')}
      </span>
    </Tap>
  );
}
