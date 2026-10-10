import { useId } from 'react';

/** The lime die from the app icon (showing five), without the icon's background. */
export default function AppDie({ size = 24 }: { size?: number }) {
  // Gradient ids must be unique on the page.
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="100 96 312 328" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id={`${id}f`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#d2fa4c" />
          <stop offset="1" stopColor="#b9e62b" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#93bd1c" />
          <stop offset="1" stopColor="#7a9f12" />
        </linearGradient>
      </defs>
      <rect x="116" y="128" width="280" height="280" rx="60" fill={`url(#${id}l)`} />
      <rect x="116" y="112" width="280" height="280" rx="60" fill={`url(#${id}f)`} />
      <g fill="#14150f">
        <circle cx="180" cy="176" r="29" />
        <circle cx="332" cy="176" r="29" />
        <circle cx="256" cy="252" r="29" />
        <circle cx="180" cy="328" r="29" />
        <circle cx="332" cy="328" r="29" />
      </g>
    </svg>
  );
}
