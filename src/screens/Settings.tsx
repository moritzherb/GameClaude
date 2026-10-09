import TopBar from '../components/TopBar';
import Tap from '../components/Tap';
import { GAMES } from '../games/registry';
import { LANGS, t } from '../i18n';
import { buzz, fxSettings, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';
import { useApp } from '../state/AppState';

type Toggle = 'sound' | 'haptics' | 'bigMode';

const OPTIONS: { key: Toggle; emoji: string; label: string; hint: string }[] = [
  { key: 'sound', emoji: '🔊', label: 'Sounds', hint: 'Boops, ticks and fanfares' },
  { key: 'haptics', emoji: '📳', label: 'Vibration', hint: 'Phone buzzes when you tap' },
  { key: 'bigMode', emoji: '🔍', label: 'Giant Mode', hint: 'Everything bigger. For later tonight.' },
];

export default function Settings() {
  const { settings, updateSettings, knows, setKnown } = useApp();
  const withExplanations = GAMES.filter((g) => g.explains && (g.component || g.online));

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="large-title">{t('Settings')}</h1>

      <section className="section">
        <h2 className="section-title">{t('Language')}</h2>
        <div className="seg two">
          {LANGS.map((l) => (
            <Tap
              key={l.id}
              className={`seg-btn${(settings.lang ?? 'en') === l.id ? ' active' : ''}`}
              onClick={() => updateSettings({ lang: l.id })}
              ariaLabel={l.label}
            >
              <span className="seg-main">{l.label}</span>
            </Tap>
          ))}
        </div>
      </section>

      <div className="settings-list">
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
                <span className="setting-label">{o.label}</span>
                <span className="setting-hint">{o.hint}</span>
              </span>
              <span className="switch">
                <span className="switch-knob" />
              </span>
            </button>
          );
        })}
      </div>

      <section className="section">
        <h2 className="section-title">Games you know</h2>
        <p className="fine-print">Switch a game on to skip its tutorials and explanations while you play. The rules stay behind the ? button.</p>
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
                  <span className="setting-label">{g.name}</span>
                  <span className="setting-hint">{on ? 'We know it: no explanations' : 'Explanations on'}</span>
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
        <h2 className="section-title">Play nice</h2>
        <ul className="plain-list">
          <li>Every sip can be water or a soft drink. No pressure, ever.</li>
          <li>Eat something before you start.</li>
          <li>Never drink and drive – plan your ride home.</li>
          <li>Look out for your mates.</li>
        </ul>
      </section>
    </main>
  );
}
