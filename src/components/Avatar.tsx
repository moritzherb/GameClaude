/** A player's avatar: their photo if they took one (own profile), else the emoji. A picture beside
 *  the name: screen readers skip it and read the name. */
export default function Avatar({ avatar, photo }: { avatar: string; photo?: string }) {
  return photo ? (
    <img className="avatar-photo" src={photo} alt="" draggable={false} />
  ) : (
    <span className="avatar-glyph" aria-hidden="true">
      {avatar}
    </span>
  );
}
