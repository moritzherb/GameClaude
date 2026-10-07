const LABELS = ['', 'Chill', 'Tipsy', 'Dangerous'];

export default function Intensity({ level, showLabel }: { level: 1 | 2 | 3; showLabel?: boolean }) {
  return (
    <span className="intensity" aria-label={`Intensity: ${LABELS[level]}`}>
      {'🍺'.repeat(level)}
      <span className="intensity-off">{'🍺'.repeat(3 - level)}</span>
      {showLabel && <span className="intensity-label">{LABELS[level]}</span>}
    </span>
  );
}
