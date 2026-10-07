const COLORS = ['var(--pink)', 'var(--yellow)', 'var(--cyan)', 'var(--lime)', 'var(--orange)', 'var(--purple)'];

/** Bouncy rainbow wordmark – every letter dances to its own beat. */
export default function Logo({ text = 'PROST!', small }: { text?: string; small?: boolean }) {
  return (
    <div className={`logo${small ? ' logo-small' : ''}`} aria-label={text} role="img">
      {[...text].map((ch, i) => (
        <span key={i} style={{ color: COLORS[i % COLORS.length], animationDelay: `${i * 0.12}s` }}>
          {ch}
        </span>
      ))}
    </div>
  );
}
