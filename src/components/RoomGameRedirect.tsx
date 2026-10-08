import { useEffect, useRef } from 'react';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';

/** When the host starts or ends a game, every phone in the room follows along. */
export default function RoomGameRedirect() {
  const { game } = useRoom();
  const previous = useRef(game);

  useEffect(() => {
    if (game === previous.current) return;
    previous.current = game;
    const onGameScreen = window.location.hash.startsWith('#/online/');
    if (game) navigate(paths.online(game));
    else if (onGameScreen) navigate(paths.room);
  }, [game]);

  return null;
}
