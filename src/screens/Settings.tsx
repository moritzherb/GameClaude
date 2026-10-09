import Flag from '../components/Flag';
import TopBar from '../components/TopBar';
import { GAMES } from '../games/registry';
import { LANGS, t, tx } from '../i18n';
import { buzz, fxSettings, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';
import { useApp } from '../state/AppState';

type Toggle = 'sound' | 'haptics' | 'bigMode';

const OPTIONS: { key: Toggle; emoji: string; label: string; hint: string }[] = [
  { key: 'sound', emoji: '🔊', label: tx('Sounds'), hint: tx('Boops, ticks and fanfares') },
  { key: 'haptics', emoji: '📳', label: tx('Vibration'), hint: tx('Phone buzzes when you tap') },
  { key: 'bigMode', emoji: '🔍', label: tx('Giant Mode'), hint: tx('Everything bigger. For later tonight.') },
];

export default function Settings() {
  const { settings, updateSettings, knows, setKnown } = useApp();
  const withExplanations = GAMES.filter((g) => g.explains && (g.component || g.online));

  return (
    <main className="screen settings-page">
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="large-title">{t('Settings')}</h1>

      <div className="settings-list">
        <div className="setting-row lang-row">
          <span className="setting-text">
            <span className="setting-label">{t('Language')}</span>
          </span>
          <span className="flags" role="radiogroup" aria-label={t('Language')}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={(settings.lang ?? 'en') === l.id}
                aria-label={l.label}
                className={`flag-btn${(settings.lang ?? 'en') === l.id ? ' active' : ''}`}
                onClick={() => {
                  sfx.pop();
                  buzz();
                  updateSettings({ lang: l.id });
                }}
              >
                <Flag lang={l.id} />
              </button>
            ))}
          </span>
        </div>

        {OPTIONS.map((o) => {
          const on = settings[o.key];
          return (
            <button
              key={o.key}
              type="button"
              role="switch"
              aria-checked={on}
              className={`setting-row${on ? ' on' : ''}`}
              onClick={() => {
                updateSettings({ [o.key]: !on });
                // Apply immediately so the feedback reflects the new state (sound ON = you hear it).
                if (o.key !== 'bigMode') fxSettings[o.key] = !on;
                sfx.pop();
                buzz();
              }}
            >
              <span className="setting-emoji">{o.emoji}</span>
              <span className="setting-text">
                <span className="setting-label">{t(o.label)}</span>
                <span className="setting-hint">{t(o.hint)}</span>
              </span>
              <span className="switch">
                <span className="switch-knob" />
              </span>
            </button>
          );
        })}
      </div>

      <section className="section">
        <h2 className="section-title">{t('Games you know')}</h2>
        <p className="fine-print">{t('Switch a game on to skip its tutorials and explanations while you play. The rules stay behind the ? button.')}</p>
        <div className="settings-list">
          {withExplanations.map((g) => {
            const on = knows(g.id);
            return (
              <button
                key={g.id}
                type="button"
                role="switch"
                aria-checked={on}
                className={`setting-row${on ? ' on' : ''}`}
                onClick={() => {
                  setKnown(g.id, !on);
                  sfx.pop();
                  buzz();
                }}
              >
                <span className="setting-emoji">{g.emoji}</span>
                <span className="setting-text">
                  <span className="setting-label">{t(g.name)}</span>
                </span>
                <span className="switch">
                  <span className="switch-knob" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">{t('Play nice')}</h2>
        <ul className="plain-list">
          <li>{t('Every sip can be water or a soft drink. No pressure, ever.')}</li>
          <li>{t('Eat something before you start.')}</li>
          <li>{t('Never drink and drive – plan your ride home.')}</li>
          <li>{t('Look out for your mates.')}</li>
        </ul>
      </section>
    </main>
  );
}
