import { pick } from '../lib/random';
import { usePersistentState } from '../lib/storage';
import { AVATARS, PLAYER_COLORS } from '../state/AppState';
import type { Profile } from './protocol';

function newProfile(): Profile {
  return {
    clientId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: '',
    avatar: pick(AVATARS),
    color: pick(PLAYER_COLORS),
  };
}

/** Who this phone is when it joins a room. Saved, so the name is there next time. */
export function useProfile() {
  const [profile, setProfile] = usePersistentState<Profile>('me', newProfile());
  return {
    profile,
    setName: (name: string) => setProfile((p) => ({ ...p, name: name.slice(0, 18) })),
    /** Another colour behind the letter. */
    rerollColor: () => setProfile((p) => ({ ...p, color: pick(PLAYER_COLORS.filter((c) => c !== p.color)) })),
    setColor: (color: string) => setProfile((p) => ({ ...p, color })),
    setPhoto: (photo: string | undefined) => setProfile((p) => ({ ...p, photo })),
  };
}
