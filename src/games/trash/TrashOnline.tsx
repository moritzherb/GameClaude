import { useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { pick } from '../../lib/random';
import { useShared } from '../../net/shared';
import { useApp, type Player } from '../../state/AppState';
import { newGame, type Game, type Who } from './logic';
import { TrashTable } from './Trash';

interface Shared {
  g: Game | null;
  /** The two who play, in seat order (seat 0, seat 1). */
  seats: Player[];
}

/** Trash on two phones: the same table, each player sees their own side at the bottom. */
export default function TrashOnline() {
  const { state, set, room, isHost, myId } = useShared<Shared>('tr', { g: null, seats: [] });
  const known = useApp().knows('trash');
  const online = room.members.filter((m) => m.online);
  const [picked, setPicked] = useState<string[]>([]);
  const [dealer, setDealer] = useState<Who>(() => pick([0, 1] as Who[]));

  /* ---------- Lobby ---------- */
  if (!state.g || state.seats.length < 2) {
    if (!isHost) {
      const host = room.members.find((m) => m.host);
      return (
        <div className="bd">
          <div className="connecting">
            <div className="connecting-emoji">🗑️</div>
            <h2 className="bd-title">{t('Trash')}</h2>
            <p className="lead">{host ? t('Waiting for {name} to deal…', { name: host.name }) : t('Waiting for the host to deal…')}</p>
          </div>
        </div>
      );
    }
    // Two play; whoever else is in the room watches. Default: the first two phones.
    const chosen = (picked.length ? picked : online.slice(0, 2).map((m) => m.id)).filter((id) => online.some((m) => m.id === id));
    const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-2));
    const seats = chosen.map((id) => online.find((m) => m.id === id)!).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color }));
    return (
      <div className="bd">
        <div className="bd-head">
          <span className="kicker">{t('A duel for two')}</span>
          <h2 className="bd-title big">{t('Trash')}</h2>
          {!known && <p className="lead">{t('Each player on their own phone. Turn your cards over first.')}</p>}
        </div>
        {online.length > 2 && (
          <>
            <h3 className="section-title">{t('Who plays?')}</h3>
            <div className="pick-grid">
              {online.map((m) => (
                <Tap
                  key={m.id}
                  className={`pick-chip${chosen.includes(m.id) ? ' selected' : ''}`}
                  style={{ '--chip': m.color } as CSSProperties}
                  onClick={() => toggle(m.id)}
                >
                  <span className="pick-chip-avatar">{m.avatar}</span>
                  <span className="pick-chip-name">{m.name}</span>
                </Tap>
              ))}
            </div>
            {!known && <p className="fine-print">{t('Everyone else watches the table.')}</p>}
          </>
        )}
        {seats.length === 2 && (
          <>
            <h3 className="section-title">{t('Who deals first?')}</h3>
            <div className="seg two">
              {seats.map((p, i) => (
                <button key={p.id} type="button" className={`seg-btn${dealer === i ? ' active' : ''}`} onClick={() => setDealer(i as Who)}>
                  <span className="seg-main">{p.name}</span>
                  <span className="seg-sub">{dealer === i ? 'Dealer' : t('starts')}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="sticky-action">
          <BigButton size="xl" disabled={seats.length < 2} onClick={() => set({ g: newGame(dealer), seats })}>
            {online.length < 2 ? t('Waiting for players…') : seats.length < 2 ? t('Pick two players') : t('Deal the cards')}
          </BigButton>
        </div>
      </div>
    );
  }

  const seat = state.seats.findIndex((s) => s.id === myId);
  return (
    <TrashTable
      g={state.g}
      setG={(g) => set((s) => ({ ...s, g }))}
      two={state.seats}
      me={seat >= 0 ? (seat as Who) : null}
      known={known}
      onAgain={isHost ? () => set((s) => ({ ...s, g: null })) : undefined}
    />
  );
}
