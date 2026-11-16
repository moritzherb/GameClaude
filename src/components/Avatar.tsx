import type { CSSProperties } from 'react';
import { PersonIcon } from './Icons';

/** The first letter of a name, as a capital (a letter made of more than one code point stays whole). */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0] ?? '';
  return first.toLocaleUpperCase();
}

/**
 * A player's avatar: their photo if they took one (own profile), else the first letter of their name
 * on their colour. A picture beside the name: screen readers skip it and read the name.
 */
export default function Avatar({ name, color, photo }: { name: string; color?: string; photo?: string }) {
  if (photo) return <img className="avatar-photo" src={photo} alt="" draggable={false} />;
  const letter = initialOf(name);
  return (
    <span className="avatar-initial" style={color ? ({ '--pc': color } as CSSProperties) : undefined} aria-hidden="true">
      <span className="avatar-letter">{letter || <PersonIcon />}</span>
    </span>
  );
}
