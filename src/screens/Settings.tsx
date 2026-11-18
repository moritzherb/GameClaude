import { useEffect, useRef, useState } from 'react';
import Alert from '../components/Alert';
import CloudBackup from '../components/CloudBackup';
import BigButton from '../components/BigButton';
import Sheet from '../components/Sheet';
import { ChevronIcon, PlusIcon, RowIcon, type RowGlyph } from '../components/Icons';
import TopBar from '../components/TopBar';
import { getLang, LANGS, t, tx } from '../i18n';
import { buzz, fxSettings, sfx } from '../lib/fx';
import { openLegal } from '../lib/legal';
import { appIcon, isNative, onNative, privacyOptions, toNative } from '../lib/native';
import { type PhoneSetting } from '../lib/platform';
import { navigate, paths } from '../lib/router';
import { loadPhoto, readPhoto, savePhoto, WALLPAPERS } from '../lib/wallpaper';
import { cloudOn } from '../net/cloud';
import { resetHome } from '../home/order';
import { useApp } from '../state/AppState';

type Toggle = 'sound' | 'haptics' | 'clean' | 'knowAll';

const OPTIONS: { key: Toggle; icon: RowGlyph; label: string; hint: string }[] = [
  { key: 'sound', icon: 'sound', label: tx('Sounds'), hint: tx('Boops, ticks and fanfares') },
  { key: 'haptics', icon: 'vibrate', label: tx('Vibration'), hint: tx('Phone buzzes when you tap') },
  { key: 'clean', icon: 'clean', label: tx('Clean table'), hint: tx('In games just the cards and the buttons you need') },
  { key: 'knowAll', icon: 'know', label: tx('We know the games'), hint: tx('No explanations in the games. The rules stay behind the ? button.') },
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
const openPrivacy = () => openLegal();

/** Whether the store app offers the ad privacy choices (the law asks for them in some places, e.g. the EU). */
function useAdChoices() {
  const [shown, setShown] = useState(privacyOptions);
  useEffect(() => onNative((msg) => msg.type === 'ads' && setShown(msg.privacyOptions)), []);
  return isNative && shown;
}

/** The app icons (mobile/assets/icons, the same die in other colours): `name` as the store app knows it. */
const APP_ICONS: { name: string | null; label: string; face: string; pip: string; bg: string }[] = [
  { name: null, label: tx('Lime'), face: '#c6f03c', pip: '#14150f', bg: '#24251f' },
  { name: 'Pink', label: tx('Pink'), face: '#ff74b5', pip: '#14150f', bg: '#24251f' },
  { name: 'Ocean', label: tx('Ocean'), face: '#5cbcfa', pip: '#14150f', bg: '#24251f' },
  { name: 'Gold', label: tx('Gold'), face: '#fbd25a', pip: '#14150f', bg: '#24251f' },
  { name: 'Night', label: tx('Night'), face: '#ececE6', pip: '#14150f', bg: '#121310' },
  { name: 'Lime', label: tx('Lime on dark'), face: '#1c1d18', pip: '#c6f03c', bg: '#bfe835' },
];

/** A small picture of an app icon: the die showing five on its ground. */
function DieIcon({ face, pip, bg }: { face: string; pip: string; bg: string }) {
  return (
    <svg className="icon-pick-art" viewBox="0 0 60 60" aria-hidden="true">
      <rect width="60" height="60" rx="14" fill={bg} />
      <g transform="rotate(-12 30 30)">
        <rect x="14" y="14" width="32" height="32" rx="8" fill={face} />
        {[
          [21.5, 21.5],
          [38.5, 21.5],
          [30, 30],
          [21.5, 38.5],
          [38.5, 38.5],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill={pip} />
        ))}
      </g>
    </svg>
  );
}

/** The store app's icon state (it tells the page when the page starts and after each change). */
function useAppIcon() {
  const [state, setState] = useState(appIcon);
  useEffect(() => onNative((msg) => msg.type === 'icon' && setState({ supported: msg.supported, current: msg.current })), []);
  return state;
}

/** Friends get a link to prost!: the share sheet, or the link copied where there's none. */
async function invite() {
  const url = `${window.location.origin}${window.location.pathname}`;
  const text = t('Let’s play prost! together:');
  try {
    if (isNative) return toNative({ type: 'share', title: 'prost!', text, url });
    if (navigator.share) return await navigator.share({ title: 'prost!', text, url });
    await navigator.clipboard.writeText(url);
  } catch {
    /* cancelled */
  }
}

export default function Settings() {
  const { settings, updateSettings } = useApp();
  const adChoices = useAdChoices();
  const [lookOpen, setLookOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const icons = useAppIcon();

  return (
    <main className="screen settings-page">
      {/* Back and title stay at the top while the page scrolls under them. */}
      <div className="screen-head">
        <TopBar onBack={() => navigate(paths.home)} />
        <h1 className="large-title">{t('Settings')}</h1>
      </div>

      <div className="settings-list">
        {/* The app speaks the phone's language; it's changed in the phone's settings. */}
        <button type="button" className="setting-row" onClick={() => setLangOpen(true)}>
          <span className="setting-emoji" aria-hidden="true"><RowIcon name="lang" /></span>
          <span className="setting-text">
            <span className="setting-label">{t('Language')}</span>
            <span className="setting-hint">{LANGS.find((l) => l.id === getLang())?.label}</span>
          </span>
          <span className="look-chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </button>

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
              <span className="setting-label">{t('Home screen')}</span>
              <span className="setting-hint">{t('Phone, wallpaper, order')}</span>
            </span>
            <span className="look-chevron" aria-hidden="true">
              <ChevronIcon />
            </span>
          </button>
          {lookOpen && (
            <>
              <div className="setting-row look-row">
                  <span className="setting-emoji" aria-hidden="true"><RowIcon name="phone" /></span>
                  <span className="setting-text">
                    <span className="setting-label">{t('Home screen')}</span>
                    <span className="setting-hint">{t('Like your phone’s own')}</span>
                  </span>
                  <Choice label={t('Home screen')} value={settings.phone ?? 'auto'} options={PHONES} onPick={(phone) => updateSettings({ phone })} />
              </div>
              <WallpaperRow />
              <ResetHomeRow />
            </>
          )}
        </div>
      </section>

      {/* prost! itself: friends, a rating, its icon (the last two only in the store app). */}
      <section className="section">
        <div className="settings-list">
          <button type="button" className="setting-row" onClick={invite}>
            <span className="setting-emoji" aria-hidden="true"><RowIcon name="invite" /></span>
            <span className="setting-text">
              <span className="setting-label">{t('Invite friends')}</span>
              <span className="setting-hint">{t('Send them prost!')}</span>
            </span>
          </button>
          {isNative && (
            <button type="button" className="setting-row" onClick={() => toNative({ type: 'review' })}>
              <span className="setting-emoji" aria-hidden="true"><RowIcon name="star" /></span>
              <span className="setting-text">
                <span className="setting-label">{t('Rate prost!')}</span>
                <span className="setting-hint">{t('A few stars help a lot')}</span>
              </span>
            </button>
          )}
          {icons.supported && (
            <button type="button" className="setting-row" onClick={() => setIconsOpen(true)}>
              <span className="setting-emoji" aria-hidden="true"><RowIcon name="appicon" /></span>
              <span className="setting-text">
                <span className="setting-label">{t('App icon')}</span>
                <span className="setting-hint">{t(APP_ICONS.find((i) => i.name === icons.current)?.label ?? 'Lime')}</span>
              </span>
            </button>
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
              <span className="setting-hint">{t('Privacy, terms of use, imprint')}</span>
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

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t('Language')} closeLabel={t('Done')}>
        <p className="lead">{t('prost! speaks your phone’s language: {lang}.', { lang: LANGS.find((l) => l.id === getLang())?.label ?? '' })}</p>
        <p className="fine-print">{t('To change it, set the language in your phone’s settings. German or English: anything else shows in English.')}</p>
        {isNative && (
          <BigButton onClick={() => toNative({ type: 'settings' })}>{t('Open settings')}</BigButton>
        )}
      </Sheet>

      <Sheet open={iconsOpen} onClose={() => setIconsOpen(false)} title={t('App icon')} closeLabel={t('Done')}>
        <div className="icon-picks" role="radiogroup" aria-label={t('App icon')}>
          {APP_ICONS.map((i) => (
            <button
              key={i.label}
              type="button"
              role="radio"
              aria-checked={icons.current === i.name}
              className={`icon-pick${icons.current === i.name ? ' on' : ''}`}
              onClick={() => {
                sfx.pop();
                buzz();
                toNative({ type: 'icon', name: i.name });
              }}
            >
              <DieIcon {...i} />
              <span>{t(i.label)}</span>
            </button>
          ))}
        </div>
      </Sheet>

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
