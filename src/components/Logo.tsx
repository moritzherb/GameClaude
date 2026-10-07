/** Wordmark: lowercase, heavy, with a gradient full stop. */
export default function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className={`logo logo-${size}`} role="img" aria-label="PROST">
      prost<span className="logo-dot">.</span>
    </div>
  );
}
