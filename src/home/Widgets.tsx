import type { CSSProperties } from 'react';
import AppDie from '../components/AppDie';
import Avatar from '../components/Avatar';
import Tap from '../components/Tap';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { launch } from '../lib/launch';
import { navigate, paths } from '../lib/router';
import type { Player } from '../state/AppState';
import { IconArt } from './AppIcon';

/** Who plays tonight: their faces and how many. Opens the crew. */
export function CrewWidget({ players }: { players: Player[] }) {
  const shown = players.slice(0, 4);
  return (
    <Tap className="widget w-crew" onClick={() => navigate(paths.players())} ariaLabel={t('The crew')}>
      <span className="w-kicker">{t('The crew')}</span>
      <span className="w-faces">
        {shown.length ? (
          shown.map((p) => (
            <span key={p.id} className="w-face" style={{ '--chip': p.color } as CSSProperties}>
              <Avatar avatar={p.avatar} photo={p.photo} />
            </span>
          ))
        ) : (
          <span className="w-face empty">+</span>
        )}
        {players.length > 4 && <span className="w-face more">+{players.length - 4}</span>}
      </span>
      <span className="w-title">{players.length ? t('{n} players', { n: players.length }) : t('Who’s playing tonight?')}</span>
    </Tap>
  );
}

/** The game played last, to jump back in; before the first game, the shuffle. */
export function LastWidget({ game, onShuffle }: { game: GameDefinition | null; onShuffle: () => void }) {
  if (!game) {
    return (
      <Tap className="widget w-last w-shuffle" onClick={onShuffle} ariaLabel={t('Shuffle')}>
        <span className="w-pop">
          <AppDie size={64} />
        </span>
        <span className="w-kicker">{t('Shuffle')}</span>
        <span className="w-title">{t('We pick, you play')}</span>
      </Tap>
    );
  }
  return (
    <Tap
      className="widget w-last"
      ariaLabel={`${t('Last played')}: ${t(game.name)}`}
      onClick={(e) => launch(e.currentTarget.querySelector('.app-icon'), game, () => navigate(paths.game(game.id)))}
    >
      <span className="w-pop">
        <IconArt color={game.color} size="lg">
          {game.emoji}
        </IconArt>
      </span>
      <span className="w-kicker">{t('Last played')}</span>
      <span className="w-title">{t(game.name)}</span>
    </Tap>
  );
}
