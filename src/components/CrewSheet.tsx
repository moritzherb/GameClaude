import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { unfill } from '../lib/noAutofill';
import { joinLink } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { MAX_PLAYERS, useApp } from '../state/AppState';
import Avatar from './Avatar';
import { PlusIcon } from './Icons';
import QrCode from './QrCode';
import Sheet from './Sheet';

/**
 * The crew from inside a game: who's playing, and a name to add someone who just turned up. Only
 * adding: taking someone out mid-game would pull them out of the game's own turns and scores.
 */
export default function CrewSheet({ game, open, onClose }: { game: GameDefinition; open: boolean; onClose: () => void }) {
  const { players, addPlayer } = useApp();
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  // A game for so many and no more (that doesn't pick its players from the crew) stops at that.
  const cap = game.maxPlayers != null && !game.picksPlayers ? Math.min(game.maxPlayers, MAX_PLAYERS) : MAX_PLAYERS;
  const full = players.length >= cap;
  const duplicate = players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());

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

  return (
    <Sheet open={open} onClose={onClose} title={t('The crew')} closeLabel={t('Done')}>
      <div className="crew-sheet">
        <form className="add-player" onSubmit={submit}>
          <input
            ref={input}
            className="add-player-input"
            type="search"
            name="prost-player"
            aria-label={t('Add player')}
            value={name}
            maxLength={18}
            placeholder={full ? (cap < MAX_PLAYERS ? t('{n} players at most', { n: cap }) : t('Party’s full')) : unfill(t('Add a name'))}
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
        {duplicate && name.trim() ? (
          <p className="warn">{t('Already playing. Try a nickname.')}</p>
        ) : (
          <p className="crew-sheet-note">{t('New players join in where the game can take them: right away, or from the next round.')}</p>
        )}
        <ul className="crew-sheet-list">
          {players.map((p) => (
            <li key={p.id} className="crew-sheet-row" style={{ '--chip': p.color } as CSSProperties}>
              <span className="bd-avatar xs" style={{ background: p.color }}>
                <Avatar avatar={p.avatar} photo={p.photo} />
              </span>
              <span className="crew-sheet-name">{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/**
 * The crew of a room game: everyone's on their own phone, so someone new joins the room with its
 * code or by scanning it, and plays along where the game can take them.
 */
export function RoomCrewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const room = useRoom();
  const code = room.code ?? '';
  return (
    <Sheet open={open} onClose={onClose} title={t('The crew')} closeLabel={t('Done')}>
      <div className="crew-sheet">
        {code && (
          <section className="room-code-card crew-sheet-code">
            <span className="kicker">{t('Room code')}</span>
            <span className="room-code" aria-label={t('Room code {code}', { code: code.split('').join(' ') })}>
              {code}
            </span>
            <QrCode text={joinLink(code)} label={t('QR code to join room {code}', { code })} />
            <span className="fine-print">{t('Scan with the camera to join')}</span>
          </section>
        )}
        <p className="crew-sheet-note">{t('New players join in where the game can take them: right away, or from the next round.')}</p>
        <ul className="crew-sheet-list">
          {room.members.map((m) => (
            <li key={m.id} className={`crew-sheet-row${m.online ? '' : ' offline'}`} style={{ '--chip': m.color } as CSSProperties}>
              <span className="bd-avatar xs" style={{ background: m.color }}>
                <Avatar avatar={m.avatar} photo={m.photo} />
              </span>
              <span className="crew-sheet-name">{m.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
