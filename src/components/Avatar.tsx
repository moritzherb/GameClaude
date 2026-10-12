/** A player's avatar: their photo if they took one (own profile), else the emoji. */
export default function Avatar({ avatar, photo }: { avatar: string; photo?: string }) {
  return photo ? <img className="avatar-photo" src={photo} alt="" draggable={false} /> : <>{avatar}</>;
}
