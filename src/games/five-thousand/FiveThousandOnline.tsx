import { useState, type CSSProperties, type SetStateAction } from 'react';
import BigButton from '../../components/BigButton';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { useShared } from '../../net/shared';
import { useApp, type Player } from '../../state/AppState';
import { FiveThousandTable } from './FiveThousand';
import { newGame, type Game } from './logic';

interface Shared {
  g: Game | null;
  /** The dice the player whose turn it is has picked, so the others see it too. */
  picked: number[];
  /** Who plays, in turn order. */
  seats: Player[];
}

/** 5000 with every player on their own phone: one table, everyone sees every roll. */
export default function FiveThousandOnline() {
  const { state, set, room, isHost, myId } = useShared<Shared>('fk', { g: null, picked: [], seats: [] });
  const known = useApp().knows('five-thousand');
  const online = room.members.filter((m) => m.online);
  const [starterId, setStarterId] = useState<string | null>(null);

  /* ---------- Lobby ---------- */
  if (!state.g || state.seats.length < 2) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <div className="connecting-emoji">🎲</div>
            <h2 className="bd-title">{t('5000')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to start the game…', { name: host.name }) : t('Waiting for the host to start a game…')}</p>
          </div>
        </div>
      );
    }
    const seats = online.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }));
    const starter = seats.find((p) => p.id === starterId) ?? seats[0];
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('Who starts?')}</h2>
          {!known && <p className="lead">{t('Everyone rolls on their own phone, the others watch. First to exactly 5000 wins.')}</p>}
        </div>
        <div className="pick-grid">
          {seats.map((p) => (
            <Tap
              key={p.id}
              className={`pick-chip${p.id === starter?.id ? ' selected' : ''}`}
              style={{ '--chip': p.color } as CSSProperties}
              onClick={() => setStarterId(p.id)}
            >
              <span className="pick-chip-avatar">{p.avatar}</span>
              <span className="pick-chip-name">{p.name}</span>
              {p.id === starter?.id && <span className="pick-chip-badge">{t('Starts')}</span>}
            </Tap>
          ))}
        </div>
        <div className="sticky-action">
          <BigButton
            size="xl"
            disabled={seats.length < 2}
            onClick={() => set({ g: newGame(seats.length, Math.max(0, seats.indexOf(starter))), picked: [], seats })}
          >
            {seats.length < 2 ? t('Waiting for players…') : t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  const seat = state.seats.findIndex((s) => s.id === myId);
  return (
    <FiveThousandTable
      g={state.g}
      setG={(g) => set((s) => ({ ...s, g }))}
      picked={state.picked}
      setPicked={(next: SetStateAction<number[]>) =>
        set((s) => {
          const picked = typeof next === 'function' ? next(s.picked) : next;
          return picked.length || s.picked.length ? { ...s, picked } : s;
        })
      }
      players={state.seats}
      me={seat >= 0 ? seat : null}
      known={known}
      onAgain={isHost ? () => set((s) => ({ ...s, g: null, picked: [] })) : undefined}
    />
  );
}
