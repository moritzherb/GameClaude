import Glyph from '../../components/Glyph';
import { ACE } from './ace';
import type { FieldPic } from './fields';

/** The Ace as a card of our own (ace.ts): white, a red A and a heart, as big as the text round it. */
export function AceCard() {
  return (
    <span className="pt-ace-card" aria-hidden>
      <span className="pt-ace-a">A</span>
      <span className="pt-ace-heart">{'♥︎'}</span>
    </span>
  );
}

/** A field's picture: its line picture, or for the Ace the card. */
export function FieldIcon({ icon }: { icon: FieldPic }) {
  return icon === ACE ? <AceCard /> : <Glyph name={icon} />;
}
