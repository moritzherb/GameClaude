import { createElement, type SVGProps } from 'react';
import { glyphNode, type GlyphName } from '../lib/glyphs';

/** A picture inside a game (lib/glyphs.ts): one stroke in the colour of the text round it, 1em big. */
export default function Glyph({ name, ...props }: { name: GlyphName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="glyph"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {glyphNode(name).map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
