import type { SVGProps } from 'react';

// Minimal line icons for the UI chrome. Emojis are reserved for games and avatars.

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export const BackIcon = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const ChevronIcon = () => (
  <Icon>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);
export const HelpIcon = () => (
  <Icon>
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
    <circle cx="12" cy="18.5" r="0.6" fill="currentColor" />
  </Icon>
);
/** Clean table on: corners pointing out (everything but the game goes). */
export const CleanIcon = () => (
  <Icon>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </Icon>
);
/** Clean table off: corners pointing in (everything comes back). */
export const UncleanIcon = () => (
  <Icon>
    <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" />
  </Icon>
);
export const SettingsIcon = () => (
  <Icon>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </Icon>
);
export const PhoneIcon = () => (
  <Icon strokeWidth={2.2}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon strokeWidth={2.2}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </Icon>
);

/* The dock's own glyphs (new look): drawn, so the apps that aren't games don't look like one. */
export const DiceIcon = () => (
  <Icon strokeWidth={1.9}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <g fill="currentColor" stroke="none">
      <circle cx="8.6" cy="8.6" r="1.45" />
      <circle cx="15.4" cy="8.6" r="1.45" />
      <circle cx="12" cy="12" r="1.45" />
      <circle cx="8.6" cy="15.4" r="1.45" />
      <circle cx="15.4" cy="15.4" r="1.45" />
    </g>
  </Icon>
);
export const PeopleIcon = () => (
  <Icon strokeWidth={1.9}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.2 19.5c.6-3.4 2.9-5.4 5.8-5.4s5.2 2 5.8 5.4" />
    <circle cx="16.6" cy="9.4" r="2.5" />
    <path d="M15.8 14.4c2.7-.2 4.6 1.6 5.1 4.6" />
  </Icon>
);
export const PersonIcon = () => (
  <Icon strokeWidth={1.9}>
    <circle cx="12" cy="8.4" r="3.7" />
    <path d="M4.8 20c.8-3.9 3.7-6.1 7.2-6.1s6.4 2.2 7.2 6.1" />
  </Icon>
);
/** Sort: an arrow down beside bars getting shorter. */
export const SortIcon = () => (
  <Icon strokeWidth={2}>
    <path d="M3 16l4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4" />
  </Icon>
);
export const SlidersIcon = () => (
  <Icon strokeWidth={1.9}>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <g fill="currentColor">
      <circle cx="9" cy="7" r="2.1" />
      <circle cx="15.5" cy="12" r="2.1" />
      <circle cx="7.5" cy="17" r="2.1" />
    </g>
  </Icon>
);

/*
 * Row glyphs for settings and game options: one stroke, the text's colour, in the row's grey tile.
 * (These were emoji; emoji stay for the games and the players.)
 */
const ROW = {
  look: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.6-.9 1.2-1.8-.5-1.1.2-2.2 1.4-2.2H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7.6 16.7 3.5 12 3.5z" />
      <g fill="currentColor" stroke="none">
        <circle cx="7.6" cy="11.4" r="1.15" />
        <circle cx="10.2" cy="7.6" r="1.15" />
        <circle cx="14.6" cy="7.8" r="1.15" />
      </g>
    </>
  ),
  theme: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  wallpaper: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="9.6" r="1.6" />
      <path d="M4 17l4.6-4.4 3.6 3.4 2.6-2.4 5.2 4.6" />
    </>
  ),
  reset: (
    <>
      <path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3L4.6 9" />
      <path d="M4.6 4.6V9H9" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.4L12 5.8v12.4l-4.6-3.7H4z" />
      <path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  vibrate: (
    <>
      <rect x="7.5" y="3.5" width="9" height="17" rx="2.2" />
      <path d="M4 8.5v7M20 8.5v7" />
    </>
  ),
  bigger: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20 20M10.5 7.8v5.4M7.8 10.5h5.4" />
    </>
  ),
  clean: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  know: (
    <>
      <path d="M2.8 9.4 12 5l9.2 4.4L12 13.8z" />
      <path d="M6.6 11.4v4.2c1.5 1.4 3.4 2 5.4 2s3.9-.6 5.4-2v-4.2M21.2 9.4v5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  ads: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </>
  ),
  backup: (
    <>
      <path d="M7 18.5h10.2a3.8 3.8 0 0 0 .6-7.6 5.6 5.6 0 0 0-10.9 1.2A3.2 3.2 0 0 0 7 18.5z" />
      <path d="M12 16v-5M9.8 13l2.2-2.2 2.2 2.2" />
    </>
  ),
  restore: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M12 7v7M9.6 11.6 12 14l2.4-2.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
      <path d="M10.2 10.5v6M13.8 10.5v6" />
    </>
  ),
  risk: <path d="M12 20.5c-3.4 0-5.9-2.4-5.9-5.6 0-2.6 1.5-4.3 2.9-5.9.3 1.5 1.1 2.5 2.1 2.8-.4-3.3.8-6.4 3.4-8.3.2 2.6 1.4 4.2 2.6 5.7 1 1.2 1.6 2.6 1.6 4.4 0 4.2-2.9 6.9-6.7 6.9z" />,
  pass: <path d="M4 12h14M13 7l5 5-5 5" />,
  cheers: (
    <>
      <path d="M5.5 8h9v10.6a1.9 1.9 0 0 1-1.9 1.9H7.4a1.9 1.9 0 0 1-1.9-1.9z" />
      <path d="M14.5 10.5h2.2a1.8 1.8 0 0 1 1.8 1.8v2.6a1.8 1.8 0 0 1-1.8 1.8h-2.2M8.6 11.5v5.5M11.4 11.5v5.5" />
      <path d="M5.5 8a2.6 2.6 0 0 1 2.9-2.6 3 3 0 0 1 5.4.4A2.2 2.2 0 0 1 14.5 8" />
    </>
  ),
} as const;

export type RowGlyph = keyof typeof ROW;

export const RowIcon = ({ name }: { name: RowGlyph }) => <Icon strokeWidth={1.9}>{ROW[name]}</Icon>;
