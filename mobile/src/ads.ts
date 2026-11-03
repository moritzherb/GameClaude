import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  MaxAdContentRating,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';
import { ADS } from './config';

/*
 * Ads, in the order Google and Apple want:
 *  1. ask for consent where the law requires it (EU/UK/…: Google's UMP form, set up in AdMob
 *     under Privacy & messaging), and nothing is requested before that;
 *  2. on iPhones, Apple's tracking question (App Tracking Transparency);
 *  3. only then start the ad SDK, for grown-ups only (the app is 18+).
 * Ads only ever come at a natural pause (a game just ended), never during a game.
 */

export interface AdsState {
  /** Ads may be requested (consent given, or not needed). */
  ready: boolean;
  /** The law asks for a way to change the ad choices later (the app shows it in Settings). */
  privacyOptions: boolean;
}

let canRequest = false;
let openedAt = Date.now();
let lastShown = 0;
let showing = false;
let interstitial: InterstitialAd | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;

const stateOf = (info: AdsConsentInfo | null): AdsState => ({
  ready: !!info?.canRequestAds,
  privacyOptions: info?.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
});

/** Once, when the app starts. */
export async function startAds(): Promise<AdsState> {
  openedAt = Date.now();
  let info: AdsConsentInfo | null = null;
  try {
    info = await AdsConsent.gatherConsent();
  } catch {
    // Offline or the form failed: what was decided last time still counts.
    info = await AdsConsent.getConsentInfo().catch(() => null);
  }
  if (Platform.OS === 'ios') {
    try {
      const { status } = await getTrackingPermissionsAsync();
      if (status === 'undetermined') await requestTrackingPermissionsAsync();
    } catch {
      /* not available: ads stay non-personalised */
    }
  }
  const state = stateOf(info);
  canRequest = state.ready;
  if (canRequest) await startSdk();
  return state;
}

let sdkStarted = false;
async function startSdk() {
  if (sdkStarted) return;
  sdkStarted = true;
  try {
    await mobileAds().setRequestConfiguration({
      // A drinking-games app: adults only, and no ads meant for children.
      maxAdContentRating: MaxAdContentRating.MA,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    loadInterstitial();
  } catch {
    sdkStarted = false;
  }
}

function loadInterstitial() {
  clearTimeout(retry);
  const old = interstitial;
  if (old) setTimeout(() => old.destroy(), 0);
  const ad = InterstitialAd.createForAdRequest(ADS.interstitial);
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    showing = false;
    loadInterstitial();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    showing = false;
    // No fill or offline: try again in a while (never in a tight loop).
    retry = setTimeout(loadInterstitial, 90_000);
  });
  ad.load();
  interstitial = ad;
}

/**
 * A game just ended. Shows an interstitial if one is ready and the last one was long enough ago
 * (and the app wasn't opened just now). Returns whether an ad shows.
 */
export function adBreak(now = Date.now()): boolean {
  if (!canRequest || showing || !interstitial?.loaded) return false;
  if (now - openedAt < ADS.graceMs || now - lastShown < ADS.minGapMs) return false;
  showing = true;
  lastShown = now;
  interstitial.show().catch(() => {
    showing = false;
    loadInterstitial();
  });
  return true;
}

/** Settings → "Privacy choices": the consent form again, to change what was chosen. */
export async function privacyChoices(): Promise<AdsState | null> {
  try {
    const info = await AdsConsent.showPrivacyOptionsForm();
    const state = stateOf(info);
    canRequest = state.ready;
    if (canRequest) await startSdk();
    return state;
  } catch {
    return null;
  }
}
