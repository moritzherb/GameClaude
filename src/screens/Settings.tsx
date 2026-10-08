import TopBar from '../components/TopBar';
import { buzz, fxSettings, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';
import { useApp, type Settings as SettingsShape } from '../state/AppState';

const OPTIONS: { key: keyof SettingsShape; emoji: string; label: string; hint: string }[] = [
  { key: 'sound', emoji: '🔊', label: 'Sounds', hint: 'Boops, ticks and fanfares' },
  { key: 'haptics', emoji: '📳', label: 'Vibration', hint: 'Phone buzzes when you tap' },
  { key: 'bigMode', emoji: '🔍', label: 'Giant Mode', hint: 'Everything bigger. For later tonight.' },
];

export default function Settings() {
  const { settings, updateSettings } = useApp();

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="large-title">Settings</h1>

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
