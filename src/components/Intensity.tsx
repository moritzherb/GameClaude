import { t, tx } from '../i18n';

const LABELS = ['', tx('Chill'), tx('Tipsy'), tx('Wild')];

/** 1–3 little bars, like a signal meter, plus an optional label. */
export default function Intensity({ level, showLabel }: { level: 1 | 2 | 3; showLabel?: boolean }) {
  return (
    <span className="intensity" aria-label={t('Intensity: {level}', { level: t(LABELS[level]) })}>
      <span className="intensity-bars">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= level ? 'on' : ''} />
        ))}
      </span>
      {showLabel && <span>{t(LABELS[level])}</span>}
    </span>
  );
}
