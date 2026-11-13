import { useEffect, useRef, useState } from 'react';
import Alert from '../components/Alert';
import CloudBackup from '../components/CloudBackup';
import Flag from '../components/Flag';
import { ChevronIcon, PlusIcon, RowIcon, type RowGlyph } from '../components/Icons';
import TopBar from '../components/TopBar';
import { LANGS, t, tx } from '../i18n';
import { buzz, fxSettings, sfx } from '../lib/fx';
import { isNative, onNative, privacyOptions, toNative } from '../lib/native';
import { lookFor, type Look, type PhoneSetting } from '../lib/platform';
import { navigate, paths } from '../lib/router';
import { loadPhoto, readPhoto, savePhoto, WALLPAPERS } from '../lib/wallpaper';
import { cloudOn } from '../net/cloud';
import { resetHome } from '../home/order';
import { useApp, type ThemeSetting } from '../state/AppState';

type Toggle = 'sound' | 'haptics' | 'bigMode' | 'clean' | 'knowAll';

const OPTIONS: { key: Toggle; icon: RowGlyph; label: string; hint: string }[] = [
  { key: 'sound', icon: 'sound', label: tx('Sounds'), hint: tx('Boops, ticks and fanfares') },
  { key: 'haptics', icon: 'vibrate', label: tx('Vibration'), hint: tx('Phone buzzes when you tap') },
  { key: 'bigMode', icon: 'bigger', label: tx('Giant Mode'), hint: tx('Everything bigger. For later tonight.') },
  { key: 'clean', icon: 'clean', label: tx('Clean table'), hint: tx('In games just the cards and the buttons you need') },
  { key: 'knowAll', icon: 'know', label: tx('We know the games'), hint: tx('No explanations in the games. The rules stay behind the ? button.') },
];

/** The app's look. Only the look: every game plays the same in both. */
const LOOKS: { id: Look; label: string }[] = [
  { id: 'pop', label: tx('New') },
  { id: 'classic', label: tx('Classic') },
];

/** Light or dark, or as the phone is. */
const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'auto', label: tx('Auto') },
  { id: 'light', label: tx('Light') },
  { id: 'dark', label: tx('Dark') },
];

/** In the new look: whose home screen. */
const PHONES: { id: PhoneSetting; label: string }[] = [
  { id: 'auto', label: tx('Auto') },
  { id: 'ios', label: tx('iPhone') },
  { id: 'android', label: tx('Android') },
];

/** A row of two or three choices, one picked. */
function Choice<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: { id: T; label: string }[]; onPick: (id: T) => void }) {
  return (
    <span className="look-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? 'active' : ''}
          onClick={() => {
            sfx.pop();
            buzz();
            onPick(o.id);
          }}
        >
          {t(o.label)}
        </button>
      ))}
    </span>
  );
}

/** The home screen's wallpaper (new look): the ground, a made one, or a photo from the phone. */
function WallpaperRow() {
  const { settings, updateSettings } = useApp();
  const [photo, setPhoto] = useState(loadPhoto);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = settings.wallpaper ?? 'ground';
  const pick = (wallpaper: string) => {
    sfx.pop();
    buzz();
    updateSettings({ wallpaper });
  };
  return (
    <div className="setting-row wall-row">
      <span className="setting-emoji" aria-hidden="true"><RowIcon name="wallpaper" /></span>
      <span className="setting-text">
        <span className="setting-label">{t('Wallpaper')}</span>
        <span className="setting-hint">{t('Behind the games on the home screen')}</span>
      </span>
      <span className="wall-options" role="radiogroup" aria-label={t('Wallpaper')}>
        {WALLPAPERS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={current === w.id}
            aria-label={t(w.label)}
            className={`wall-swatch${current === w.id ? ' active' : ''}`}
            style={w.background ? { background: w.background } : undefined}
            onClick={() => pick(w.id)}
          />
        ))}
        {photo && (
          <button
            type="button"
            role="radio"
            aria-checked={current === 'photo'}
            aria-label={t('Your photo')}
            className={`wall-swatch${current === 'photo' ? ' active' : ''}`}
            style={{ background: `url("${photo.data}") center / cover` }}
            onClick={() => pick('photo')}
          />
        )}
        <button type="button" className="wall-swatch add" aria-label={t('Choose a photo')} disabled={busy} onClick={() => input.current?.click()}>
          <PlusIcon />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBusy(true);
            try {
              const p = await readPhoto(file);
              savePhoto(p);
              setPhoto(p);
              pick('photo');
            } catch {
              // Not an image the phone can read: nothing changes.
            } finally {
              setBusy(false);
            }
          }}
        />
      </span>
    </div>
  );
}

/** The home screens as they first were: the games taken off it back, the first order. */
function ResetHomeRow() {
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <button type="button" className="setting-row" disabled={done} onClick={() => setAsking(true)}>
        <span className="setting-emoji" aria-hidden="true"><RowIcon name="reset" /></span>
        <span className="setting-text">
          <span className="setting-label">{t('Reset home screen')}</span>
          <span className="setting-hint">{done ? '✓' : t('Every game back, in the first order')}</span>
        </span>
      </button>
      {/* It can't be undone (your own order and the games you took off go), so it asks first. */}
      {asking && (
        <Alert
          title={t('Reset home screen?')}
          text={t('Every game comes back, in the first order. Your own order is gone.')}
          action={t('Reset')}
          onConfirm={() => {
            resetHome();
            setDone(true);
            setAsking(false);
            sfx.pop();
            buzz();
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </>
  );
}

/**
 * The privacy policy, on the website (in the store app: in the phone's browser). On the home-screen
 * app there's no browser bar to come back with, so it opens in place and its own back button returns.
 */
function openPrivacy() {
  const url = new URL('privacy.html', window.location.href.split('#')[0]).href;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (isNative) toNative({ type: 'open', url });
  else if (standalone) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

/** Whether the store app offers the ad privacy choices (the law asks for them in some places, e.g. the EU). */
function useAdChoices() {
  const [shown, setShown] = useState(privacyOptions);
  useEffect(() => onNative((msg) => msg.type === 'ads' && setShown(msg.privacyOptions)), []);
  return isNative && shown;
}

export default function Settings() {
  const { settings, updateSettings } = useApp();
  const adChoices = useAdChoices();
  const [lookOpen, setLookOpen] = useState(false);

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
          const on = !!settings[o.key];
          return (
            <button
              key={o.key}
              type="button"
              role="switch"
              aria-checked={on}
              className={`setting-row${on ? ' on' : ''}`}
              onClick={() => {
                // Switching it off brings every game's explanations back (also older marks, game by game).
                updateSettings(o.key === 'knowAll' ? { knowAll: !on, known: [] } : { [o.key]: !on });
                // Apply immediately so the feedback reflects the new state (sound ON = you hear it).
                if (o.key === 'sound' || o.key === 'haptics') fxSettings[o.key] = !on;
                sfx.pop();
                buzz();
              }}
            >
              <span className="setting-emoji" aria-hidden="true"><RowIcon name={o.icon} /></span>
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

      {/* How it looks: one row that opens (most people set it once), so the list stays short. */}
      <section className="section">
        <div className="settings-list">
          <button type="button" className={`setting-row look-toggle${lookOpen ? ' open' : ''}`} aria-expanded={lookOpen} onClick={() => setLookOpen(!lookOpen)}>
            <span className="setting-emoji" aria-hidden="true"><RowIcon name="look" /></span>
            <span className="setting-text">
              <span className="setting-label">{t('Look and home screen')}</span>
              <span className="setting-hint">
                {[LOOKS.find((x) => x.id === lookFor(settings.look))?.label, THEMES.find((x) => x.id === (settings.theme ?? 'auto'))?.label].map((x) => t(x ?? '')).join(' · ')}
              </span>
            </span>
            <span className="look-chevron" aria-hidden="true">
              <ChevronIcon />
            </span>
          </button>
          {lookOpen && (
            <>
              <div className="setting-row look-row">
                <span className="setting-emoji" aria-hidden="true"><RowIcon name="look" /></span>
                <span className="setting-text">
                  <span className="setting-label">{t('Look')}</span>
                  <span className="setting-hint">{t('Only the look: every game plays the same')}</span>
                </span>
                <Choice label={t('Look')} value={lookFor(settings.look)} options={LOOKS} onPick={(look) => updateSettings({ look })} />
              </div>

              <div className="setting-row look-row">
                <span className="setting-emoji" aria-hidden="true"><RowIcon name="theme" /></span>
                <span className="setting-text">
                  <span className="setting-label">{t('Appearance')}</span>
                  <span className="setting-hint">{t('Light, dark, or like your phone')}</span>
                </span>
                <Choice label={t('Appearance')} value={settings.theme ?? 'auto'} options={THEMES} onPick={(theme) => updateSettings({ theme })} />
              </div>

              {lookFor(settings.look) === 'pop' && (
                <div className="setting-row look-row">
                  <span className="setting-emoji" aria-hidden="true"><RowIcon name="phone" /></span>
                  <span className="setting-text">
                    <span className="setting-label">{t('Home screen')}</span>
                    <span className="setting-hint">{t('Like your phone’s own')}</span>
                  </span>
                  <Choice label={t('Home screen')} value={settings.phone ?? 'auto'} options={PHONES} onPick={(phone) => updateSettings({ phone })} />
                </div>
              )}
              {lookFor(settings.look) === 'pop' && <WallpaperRow />}
              {lookFor(settings.look) === 'pop' && <ResetHomeRow />}
            </>
          )}
        </div>
      </section>

      {cloudOn && <CloudBackup />}

      <section className="section">
        <h2 className="section-title">{t('Privacy')}</h2>
        <div className="settings-list">
          <button type="button" className="setting-row" onClick={openPrivacy}>
            <span className="setting-emoji" aria-hidden="true"><RowIcon name="lock" /></span>
            <span className="setting-text">
              <span className="setting-label">{t('Privacy policy')}</span>
              <span className="setting-hint">{t('What the app keeps and why')}</span>
            </span>
          </button>
          {adChoices && (
            <button type="button" className="setting-row" onClick={() => toNative({ type: 'privacy' })}>
              <span className="setting-emoji" aria-hidden="true"><RowIcon name="ads" /></span>
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
