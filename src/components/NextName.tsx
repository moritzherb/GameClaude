import { Fragment } from 'react';

/** A translated "Next: {name} →" with the name picked out in green, so you see at a glance who's up. */
export default function NextName({ text, name }: { text: string; name: string }) {
  return (
    <>
      {text.split('{name}').map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="next-name">{name}</span>}
          {part}
        </Fragment>
      ))}
    </>
  );
}
