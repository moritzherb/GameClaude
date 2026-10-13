import { useApp } from '../state/AppState';
import { useRoom } from './RoomProvider';

/**
 * A player's photo by their id: someone in the room, or someone in this phone's crew. Room games
 * send their seats without photos (they would make every message heavy); each phone looks them up.
 */
export function usePhotoOf() {
  const room = useRoom();
  const { players } = useApp();
  return (id: string) => room.members.find((m) => m.id === id)?.photo ?? players.find((p) => p.id === id)?.photo;
}
