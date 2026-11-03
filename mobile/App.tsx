import Constants from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, KeyboardAvoidingView, Linking, Platform, Share, StyleSheet, useColorScheme, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import html from './web/html';
import { adBreak, privacyChoices, startAds, type AdsState } from './src/ads';
import { beforeLoadScript, isOwnPage, parseMessage, toPageScript, type ToPage } from './src/bridge';
import { ADS, WEB_URL } from './src/config';
import { playPattern } from './src/haptics';
import { flush, loadSaved, replaceAll, setItem } from './src/storage';

// The splash stays until the web app has drawn its first screen (no white flash).
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

/** The page's own colours (index.html, theme-color): the edges around it match. */
const BG = { light: '#f1ede3', dark: '#10110e' };

// react-native-webview 14 types its class as WebView<P = undefined>, whose props then come out as
// `never`: fix P to "no extra props".
const Page = WebView<object>;
type PageRef = InstanceType<typeof Page>;

/** The bundled page, shown as if it came from the website (same origin, so its links point there). */
const SOURCE = { html, baseUrl: WEB_URL };

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const dark = useColorScheme() === 'dark';
  const bg = dark ? BG.dark : BG.light;
  const insets = useSafeAreaInsets();
  const web = useRef<PageRef>(null);
  const pageReady = useRef(false);
  const [ads, setAds] = useState<AdsState>({ ready: false, privacyOptions: false });
  // Ads (and their consent form, Apple's tracking question) only once the page shows and the age
  // check is passed: nothing for anyone who said they're under age.
  const [shown, setShown] = useState(false);
  const [adult, setAdult] = useState(() => loadSaved()['prost:age-ok'] === 'true');
  const [playing, setPlaying] = useState(false);
  // A new WebView after the system ended its process (memory pressure): the page starts again.
  const [webKey, setWebKey] = useState(0);

  const script = useMemo(
    () =>
      beforeLoadScript(
        {
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          version: Constants.expoConfig?.version ?? '0',
          storeSafe: true,
        },
        loadSaved(),
      ),
    // The saved copy is read again for a restarted WebView.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [webKey],
  );

  const send = useCallback((msg: ToPage) => web.current?.injectJavaScript(toPageScript(msg)), []);

  const adsAsked = useRef(false);
  useEffect(() => {
    if (!shown || !adult || adsAsked.current) return;
    adsAsked.current = true;
    void startAds().then((state) => {
      setAds(state);
      if (pageReady.current) send({ type: 'ads', privacyOptions: state.privacyOptions });
    });
  }, [shown, adult, send]);

  // Android's back button: the page decides (close a sheet, the escape button, or leave the app).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      send({ type: 'back' });
      return true;
    });
    return () => sub.remove();
  }, [send]);

  // The app may be closed for good in the background: save the storage copy first.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state !== 'active' && flush());
    return () => sub.remove();
  }, []);

  // Never stuck behind the splash, whatever happens to the page.
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hide();
      setShown(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const restart = useCallback(() => {
    pageReady.current = false;
    setWebKey((k) => k + 1);
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const msg = parseMessage(e.nativeEvent.data);
      if (!msg) return;
      switch (msg.type) {
        case 'ready':
          pageReady.current = true;
          SplashScreen.hide();
          setShown(true);
          send({ type: 'ads', privacyOptions: ads.privacyOptions });
          break;
        case 'haptic':
          if (Array.isArray(msg.pattern)) playPattern(msg.pattern);
          break;
        case 'awake':
          if (msg.on) void activateKeepAwakeAsync('game').catch(() => {});
          else void deactivateKeepAwake('game').catch(() => {});
          break;
        case 'share':
          void Share.share(
            Platform.OS === 'ios' && msg.url
              ? { message: msg.text, url: msg.url, title: msg.title }
              : { message: msg.url ? `${msg.text}\n${msg.url}` : msg.text, title: msg.title },
          ).catch(() => {});
          break;
        case 'screen':
          setPlaying(!!msg.playing);
          break;
        case 'break':
          adBreak();
          break;
        case 'privacy':
          void privacyChoices().then((state) => {
            if (!state) return;
            setAds(state);
            send({ type: 'ads', privacyOptions: state.privacyOptions });
          });
          break;
        case 'open':
          if (/^https?:\/\//.test(msg.url)) void Linking.openURL(msg.url).catch(() => {});
          break;
        case 'exit':
          BackHandler.exitApp();
          break;
        case 'reload':
          restart();
          break;
        case 'store':
          if (typeof msg.key === 'string') setItem(msg.key, typeof msg.value === 'string' ? msg.value : null);
          if (msg.key === 'prost:age-ok' && msg.value === 'true') setAdult(true);
          break;
        case 'store-all':
          if (msg.items && typeof msg.items === 'object') {
            replaceAll(msg.items);
            if (msg.items['prost:age-ok'] === 'true') setAdult(true);
          }
          break;
      }
    },
    [ads.privacyOptions, restart, send],
  );

  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    if (isOwnPage(req.url, WEB_URL)) return true;
    if (/^(https?|mailto|tel):/.test(req.url)) void Linking.openURL(req.url).catch(() => {});
    return false;
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'android' ? 'height' : undefined}>
        <Page
          key={webKey}
          ref={web}
          style={[styles.fill, { backgroundColor: bg }]}
          source={SOURCE}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={script}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStart}
          onContentProcessDidTerminate={restart}
          onRenderProcessGone={restart}
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          bounces={false}
          overScrollMode="never"
          pullToRefreshEnabled={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          hideKeyboardAccessoryView
          textZoom={100}
          decelerationRate="normal"
          webviewDebuggingEnabled={__DEV__}
        />
      </KeyboardAvoidingView>
      {ads.ready && ADS.bannerOn && !playing && (
        <View style={styles.banner}>
          <BannerAd unitId={ADS.banner} size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  banner: { alignItems: 'center' },
});
