import { useEffect, useState } from 'react';
import CloudBackup from '../components/CloudBackup';
import Flag from '../components/Flag';
import TopBar from '../components/TopBar';
import { GAMES } from '../games/registry';
import { LANGS, t, tx } from '../i18n';
import { buzz, fxSettings, sfx } from '../lib/fx';
import { isNative, onNative, privacyOptions, toNative } from '../lib/native';
import type { Look } from '../lib/platform';
import { navigate, paths } from '../lib/router';
import { cloudOn } from '../net/cloud';
import { useApp } from '../state/AppState';

type Toggle = 'sound' | 'haptics' | 'bigMode' | 'clean';

const OPTIONS: { key: Toggle; emoji: string; label: string; hint: string }[] = [
  { key: 'sound', emoji: '🔊', label: tx('Sounds'), hint: tx('Boops, ticks and fanfares') },
  { key: 'haptics', emoji: '📳', label: tx('Vibration'), hint: tx('Phone buzzes when you tap') },
  { key: 'bigMode', emoji: '🔍', label: tx('Giant Mode'), hint: tx('Everything bigger. For later tonight.') },
  { key: 'clean', emoji: '🃏', label: tx('Clean table'), hint: tx('In games just the cards and the buttons you need') },
];

/** Whose home screen the app wears. */
const LOOKS: { id: Look; label: string }[] = [
  { id: 'auto', label: tx('Auto') },
  { id: 'ios', label: tx('iPhone') },
  { id: 'android', label: tx('Android') },
];

/** The privacy policy, on the website (in the store app: in the phone's browser). */
function openPrivacy() {
  const url = new URL('privacy.html', window.location.href.split('#')[0]).href;
  if (isNative) toNative({ type: 'open', url });
  else window.open(url, '_blank', 'noopener');
}

/** Whether the store app offers the ad privacy choices (the law asks for them in some places, e.g. the EU). */
function useAdChoices() {
  const [shown, setShown] = useState(privacyOptions);
  useEffect(() => onNative((msg) => msg.type === 'ads' && setShown(msg.privacyOptions)), []);
  return isNative && shown;
}

export default function Settings() {
  const { settings, updateSettings, markedKnown, setKnown } = useApp();
  const adChoices = useAdChoices();
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

        <div className="setting-row look-row">
          <span className="setting-emoji">📱</span>
          <span className="setting-text">
            <span className="setting-label">{t('Home screen')}</span>
            <span className="setting-hint">{t('Looks like your phone’s own')}</span>
          </span>
          <span className="look-seg" role="radiogroup" aria-label={t('Home screen')}>
            {LOOKS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={(settings.look ?? 'auto') === l.id}
                className={(settings.look ?? 'auto') === l.id ? 'active' : ''}
                onClick={() => {
                  sfx.pop();
                  buzz();
                  updateSettings({ look: l.id });
                }}
              >
                {t(l.label)}
              </button>
            ))}
          </span>
        </div>

        {OPTIONS.map((o) => {
          const on = !!settings[o.key];
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
                if (o.key === 'sound' || o.key === 'haptics') fxSettings[o.key] = !on;
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
            const on = markedKnown(g.id);
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

      {cloudOn && <CloudBackup />}

      <section className="section">
        <h2 className="section-title">{t('Privacy')}</h2>
        <div className="settings-list">
          <button type="button" className="setting-row" onClick={openPrivacy}>
            <span className="setting-emoji">🔒</span>
            <span className="setting-text">
              <span className="setting-label">{t('Privacy policy')}</span>
              <span className="setting-hint">{t('What the app keeps and why')}</span>
            </span>
          </button>
          {adChoices && (
            <button type="button" className="setting-row" onClick={() => toNative({ type: 'privacy' })}>
              <span className="setting-emoji">🎯</span>
              <span className="setting-text">
                <span className="setting-label">{t('Ad choices')}</span>
                <span className="setting-hint">{t('Change what the ads may use')}</span>
              </span>
            </button>
          )}
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
