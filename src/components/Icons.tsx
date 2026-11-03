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
