import { useEffect, useState, type CSSProperties } from 'react';
import BigButton from '../components/BigButton';
import { CloseIcon } from '../components/Icons';
import QrCode from '../components/QrCode';
import Tap from '../components/Tap';
import TopBar from '../components/TopBar';
import { findGame, onlineGames } from '../games/registry';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';
import { useProfile } from '../net/profile';
import { normalizeCode } from '../net/protocol';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

/** Link that opens the app straight on the join screen for this room. */
function joinLink(code: string) {
  return `${window.location.origin}${window.location.pathname}#${paths.join(code)}`;
}

export default function Room({ joinCode }: { joinCode: string | null }) {
  const room = useRoom();
  const inRoom = room.status === 'open' || room.status === 'reconnecting';
  if (inRoom || room.status === 'connecting') return <Lobby />;
  return <Start joinCode={joinCode} />;
}

/* ---------- Not in a room yet: host or join ---------- */

function Start({ joinCode }: { joinCode: string | null }) {
  const room = useRoom();
  const { profile, setName, rerollAvatar } = useProfile();
  const [code, setCode] = useState(joinCode ? normalizeCode(joinCode) : '');
  const [nameMissing, setNameMissing] = useState(false);
  const fromLink = !!joinCode;
  // Inside another page (like a preview frame) direct phone connections are usually blocked.
  const embedded = window.self !== window.top;

  const ready = () => {
    if (profile.name.trim()) return true;
    setNameMissing(true);
    sfx.boo();
    buzz([30, 40, 30]);
    document.getElementById('room-nick')?.focus();
    return false;
  };

  const doJoin = () => {
    if (!ready()) return;
    if (code.length < 4) {
      sfx.boo();
      document.getElementById('room-code')?.focus();
      return;
    }
    room.join(code, { ...profile, name: profile.name.trim() });
  };

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="large-title">{t('Play together')}</h1>
      <p className="lead">{t('Everyone joins the same room with their own phone. One phone hosts, the others scan the QR code or type the room code.')}</p>

      {embedded && (
        <p className="notice">{t('This preview can’t connect phones. Open the prost! website (moritzherb.github.io/GameClaude) to play together.')}</p>
      )}
      {room.message && <p className={`notice ${room.status === 'error' ? 'bad' : ''}`}>{room.message}</p>}

      <section className="me-card">
        <Tap className="player-avatar me-avatar" style={{ '--chip': profile.color } as CSSProperties} onClick={rerollAvatar} ariaLabel={t('New avatar')}>
          {profile.avatar}
        </Tap>
        <label className="me-field" htmlFor="room-nick">
          <span className="me-label">{t('Your name')}</span>
          <input
            id="room-nick"
            name="prost-nick"
            className={`me-input${nameMissing && !profile.name.trim() ? ' missing' : ''}`}
            value={profile.name}
            maxLength={18}
            placeholder={t('Type your name')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="words"
            enterKeyHint="done"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </section>

      {fromLink ? (
        <div className="stack">
          <BigButton size="xl" onClick={doJoin}>
            {t('Join room {code}', { code })}
          </BigButton>
          <button type="button" className="text-btn" onClick={() => navigate(paths.room)}>
            {t('Host my own room instead')}
          </button>
        </div>
      ) : (
        <>
          <BigButton size="xl" onClick={() => ready() && room.host({ ...profile, name: profile.name.trim() })}>
            {t('Host a room')}
          </BigButton>

          <div className="divider">
            <span>{t('or join one')}</span>
          </div>

          <form
            className="join-row"
            onSubmit={(e) => {
              e.preventDefault();
              doJoin();
            }}
          >
            <input
              id="room-code"
              name="prost-room"
              className="code-input"
              value={code}
              placeholder={t('CODE')}
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              aria-label={t('Room code')}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
            />
            <button type="submit" className="join-btn" disabled={code.length < 4}>
              {t('Join')}
            </button>
          </form>
        </>
      )}

      <p className="fine-print">
        {t('Phones connect directly to each other. Works on the same Wi-Fi or on mobile data. Keep the app open on the host phone.')}
      </p>
    </main>
  );
}

/* ---------- In a room: the lobby ---------- */

function Lobby() {
  const room = useRoom();
  const { profile } = useProfile();
  const { replacePlayers } = useApp();
  const [armLeave, setArmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHost = room.role === 'host';
  const code = room.code ?? '';

  useEffect(() => {
    if (!armLeave) return;
    const timeout = setTimeout(() => setArmLeave(false), 3000);
    return () => clearTimeout(timeout);
  }, [armLeave]);

  if (room.status === 'connecting') {
    return (
      <main className="screen">
        <TopBar onBack={() => room.leave()} icon="close" />
        <div className="connecting">
          <div className="connecting-emoji">📡</div>
          <h1 className="bd-title">{isHost ? t('Opening the room…') : t('Joining {code}…', { code })}</h1>
          <p className="lead">{t('This takes a few seconds.')}</p>
        </div>
        <div className="sticky-action">
          <BigButton variant="glass" onClick={() => room.leave()}>
            {t('Cancel')}
          </BigButton>
        </div>
      </main>
    );
  }

  const share = async () => {
    const url = joinLink(code);
    try {
      if (navigator.share) {
        await navigator.share({ title: t('prost! room'), text: t('Join my prost! room: {code}', { code }), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* cancelled */
    }
  };

  const online = room.members.filter((m) => m.online).length;
  const running = room.game ? findGame(room.game) : undefined;

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.home)} title={isHost ? t('Your room') : t('Room')} />

      {room.status === 'reconnecting' && <p className="notice">{t('Connection lost. Reconnecting to the host…')}</p>}

      <section className="room-code-card">
        <span className="kicker">{t('Room code')}</span>
        <span className="room-code" aria-label={t('Room code {code}', { code: code.split('').join(' ') })}>
          {code}
        </span>
        <QrCode text={joinLink(code)} label={t('QR code to join room {code}', { code })} />
        <span className="fine-print">{t('Scan with the camera to join')}</span>
        <button type="button" className="link-btn" onClick={share}>
          {copied ? t('Link copied ✓') : t('Share link')}
        </button>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t('Players')}</h2>
          <span className="fine-print">
            {online === 1 ? t('{n} phone connected', { n: online }) : t('{n} phones connected', { n: online })}
          </span>
        </div>
        <ul className="member-list">
          {room.members.map((m) => (
            <li key={m.id} className={`member-row pop-in${m.online ? '' : ' offline'}`}>
              <span className="player-avatar" style={{ '--chip': m.color } as CSSProperties}>
                {m.avatar}
              </span>
              <span className="member-text">
                <span className="member-name">{m.name}</span>
                <span className="member-tags">
                  {m.host && <span className="tag-pill">{t('Host')}</span>}
                  {m.id === profile.clientId && <span className="tag-pill you">{t('You')}</span>}
                  {!m.online && <span className="tag-pill off">{t('Offline')}</span>}
                </span>
              </span>
              <span className={`online-dot${m.online ? ' on' : ''}`} aria-label={m.online ? t('Online') : t('Offline')} />
              {isHost && !m.host && (
                <Tap className="player-remove" onClick={() => room.removeMember(m.id)} ariaLabel={t('Remove {name}', { name: m.name })}>
                  <CloseIcon />
                </Tap>
              )}
            </li>
          ))}
        </ul>
        {room.members.length <= 1 && isHost && <p className="lead">{t('Waiting for the others to join…')}</p>}
      </section>

      <Tap className="cheers-btn" onClick={room.sendCheers}>
        <span className="cheers-emoji">🍻</span>
        <span>{t('Cheers!')}</span>
        <span className="cheers-sub">{t('Shows up on every phone')}</span>
      </Tap>

      {running ? (
        <BigButton size="xl" onClick={() => navigate(paths.online(running.id))}>
          {running.emoji} {t('Back to {game}', { game: t(running.name) })}
        </BigButton>
      ) : isHost ? (
        <section className="section">
          <h2 className="section-title">{t('Games for every phone')}</h2>
          <div className="online-games">
            {onlineGames().map((g) => (
              <Tap
                key={g.id}
                className="online-game"
                style={{ '--card-bg': g.color } as CSSProperties}
                onClick={() => {
                  room.startGame(g.id);
                  navigate(paths.online(g.id));
                }}
              >
                <span className="online-game-emoji">{g.emoji}</span>
                <span className="online-game-text">
                  <span className="online-game-name">{t(g.name)}</span>
                  <span className="online-game-tagline">{t(g.tagline)}</span>
                </span>
                <span className="online-game-go">{t('Start')}</span>
              </Tap>
            ))}
          </div>
          <p className="fine-print">{t('Or use everyone in the room as the player list for the one-phone games:')}</p>
          <BigButton
            variant="glass"
            disabled={room.members.length < 2}
            onClick={() => {
              replacePlayers(room.members.map((m) => ({ name: m.name, avatar: m.avatar, color: m.color })));
              navigate(paths.players());
            }}
          >
            {t('Use as player list')}
          </BigButton>
        </section>
      ) : (
        <p className="lead center">{t('Waiting for the host to start a game…')}</p>
      )}

      <button
        type="button"
        className={`text-btn${armLeave ? ' danger' : ''}`}
        onClick={() => {
          buzz();
          if (armLeave) room.leave();
          else setArmLeave(true);
        }}
      >
        {armLeave
          ? isHost
            ? t('Tap again to close the room for everyone')
            : t('Tap again to leave')
          : isHost
            ? t('Close room')
            : t('Leave room')}
      </button>
    </main>
  );
}
