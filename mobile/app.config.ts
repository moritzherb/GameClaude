import type { ExpoConfig } from 'expo/config';

/*
 * The store app. Everything account-specific comes from the environment (EAS → Environment
 * variables, see docs/STORE.md); without it, Google's test IDs are used, so the app builds and
 * runs before the AdMob account exists.
 */

// Google's sample AdMob app IDs (test ads only).
const TEST_APP_ID = { ios: 'ca-app-pub-3940256099942544~1458002511', android: 'ca-app-pub-3940256099942544~3347511713' };

const DARK = '#20211c';
const LIGHT = '#f1ede3';

const config: ExpoConfig = {
  name: 'prost!',
  slug: 'prost',
  scheme: 'prost',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: DARK,
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_ID ?? 'com.moritzherb.prost',
    buildNumber: '1',
    // iPhone only: the games are made for a phone passed around the table.
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      // The profile photo: the page's file picker offers "Take Photo" too.
      NSCameraUsageDescription: 'Take a photo for your profile.',
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        // localStorage copy and settings (expo-file-system, React Native itself).
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1'] },
      ],
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE ?? 'com.moritzherb.prost',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: DARK,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Nothing the games don't need.
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: process.env.ADMOB_IOS_APP_ID ?? TEST_APP_ID.ios,
        androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? TEST_APP_ID.android,
        // Measurement starts only with the SDK, after consent (see src/ads.ts).
        delayAppMeasurementInit: true,
        // Google's own SKAdNetwork ID. Add the ad networks' list from Google's page when using mediation (docs/STORE.md).
        skAdNetworkItems: ['cstr6suwn9.skadnetwork'],
      },
    ],
    [
      'expo-tracking-transparency',
      { userTrackingPermission: 'Allow tracking to see ads that fit you better. The games stay free either way.' },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: LIGHT,
        dark: { image: './assets/splash-icon.png', backgroundColor: DARK },
      },
    ],
    'expo-build-properties',
  ],
  extra: {
    // From `npx eas-cli init` (docs/STORE.md): paste the project ID here.
    eas: { projectId: process.env.EAS_PROJECT_ID ?? undefined },
  },
};

export default config;
