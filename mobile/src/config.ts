import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Where the web app lives online. The bundled copy runs under this address (as its origin), so
 * room links and QR codes point at the website: friends without the app join in their browser.
 */
export const WEB_URL = 'https://moritzherb.github.io/GameClaude/';

/** The privacy policy (both stores and AdMob want one). */
export const PRIVACY_URL = `${WEB_URL}privacy.html`;

/*
 * Ad units from AdMob (Apps → prost! → Ad units), set as EAS environment variables (see
 * docs/STORE.md). Expo only fills in process.env.EXPO_PUBLIC_… written out in full like below.
 * Without them, and always in development, Google's test units are used: they always fill, never
 * pay, and tapping them can't get the AdMob account banned.
 */
const real = Platform.select({
  ios: { interstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL, banner: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER },
  android: { interstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL, banner: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER },
  default: { interstitial: undefined, banner: undefined },
});
const pick = (unit: string | undefined, test: string) => (!__DEV__ && unit ? unit : test);

export const ADS = {
  /** Shown between games (when one ends), never during one. */
  interstitial: pick(real.interstitial, TestIds.INTERSTITIAL),
  /** A banner under the menus (home, game list, rules, settings). Never in a game. */
  banner: pick(real.banner, TestIds.ADAPTIVE_BANNER),
  bannerOn: process.env.EXPO_PUBLIC_ADS_BANNER !== 'off',
  /** At most one interstitial in this long… */
  minGapMs: 4 * 60_000,
  /** …and none in the first minutes after opening the app. */
  graceMs: 3 * 60_000,
};
