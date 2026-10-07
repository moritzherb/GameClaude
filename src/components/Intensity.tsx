const LABELS = ['', 'Chill', 'Tipsy', 'Wild'];

/** 1–3 little bars, like a signal meter, plus an optional label. */
export default function Intensity({ level, showLabel }: { level: 1 | 2 | 3; showLabel?: boolean }) {
  return (
    <span className="intensity" aria-label={`Intensity: ${LABELS[level]}`}>
      <span className="intensity-bars">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= level ? 'on' : ''} />
        ))}
      </span>
      {showLabel && <span>{LABELS[level]}</span>}
    </span>
  );
}
