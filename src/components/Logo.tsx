/** Wordmark: condensed lowercase, the bang in lime. */
export default function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className={`logo logo-${size}`} role="img" aria-label="prost!">
      prost<span className="logo-bang">!</span>
    </div>
  );
}
