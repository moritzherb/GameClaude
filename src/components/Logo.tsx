/** Wordmark: condensed caps like a gig poster, the bang in lime. */
export default function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className={`logo logo-${size}`} role="img" aria-label="PROST!">
      PROST<span className="logo-bang">!</span>
    </div>
  );
}
