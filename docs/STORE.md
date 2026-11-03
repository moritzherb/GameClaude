# prost! im App Store und bei Google Play

Diese Anleitung führt vom Code bis zur veröffentlichten App mit Werbung. Was nur du machen kannst (Konten, Zahlungen,
Formulare in den Stores), steht als **Du:** da.

## So ist die App gebaut

```
mobile/          Die Store-App: Expo (SDK 58) / React Native 0.88
  App.tsx        Zeigt die Web-App offline in einer WebView, dazu alles Native:
                 Werbung, Einwilligung, Haptik, Bildschirm an, Teilen, Android-Zurück, Speicher-Kopie, Splash
  src/ads.ts     AdMob: erst Einwilligung (UMP), dann Apples Tracking-Frage (ATT), dann das SDK
  src/config.ts  Werbe-IDs (aus Umgebungsvariablen; ohne sie Googles Test-Anzeigen), Häufigkeit
  app.config.ts  Name, Bundle-ID, Icons, Berechtigungen, AdMob-App-IDs
  eas.json       Build-Profile für EAS (Expos Cloud-Builds: kein Mac nötig)
src/lib/native.ts  Die Gegenseite in der Web-App (Nachrichten zwischen Web und App)
src/net/cloud.ts   Supabase: Backup-Code und geteilte Party-Bretter
supabase/        Datenbank-Schema mit Zugriffsregeln (getestet in supabase/tests)
public/privacy.html  Datenschutzerklärung + Impressum (Vorlage, ausfüllen!)
```

Die Spiele selbst sind dieselbe Web-App wie auf der Website. `npm run build:app` packt sie in **eine** HTML-Datei
(Skripte, Styles, Schriften, Bilder inklusive). Die App liefert sie im Paket mit, sie läuft also komplett offline.
Ein Fix an einem Spiel gilt damit für Website und App gleichzeitig.

Unterschiede in der App:

- Werbung: Interstitial **nur nach einem Spiel**, höchstens alle 4 Minuten, nie in den ersten 3 Minuten.
  Banner nur in den Menüs, nie im Spiel.
- Echte Haptik auf dem iPhone. Der Browser kann dort nicht vibrieren.
- Der Bildschirm bleibt während eines Spiels an.
- Teilen über das System-Menü.
- Android-Zurück verhält sich wie der Knopf oben links: Er fragt im Spiel nach und schließt die App auf der Startseite.
- **Entschärfte Inhalte** (`src/i18n/store.ts`). Die Website bleibt, wie sie ist. In der App gilt:

  | Website | App |
  | --- | --- |
  | Shots, „Exen“, „Glas leer“, „Trink aus“, „Ex!“ | Schlucke, „Großer Schluck“ = 3 Schlucke, „Trink 3!“ |
  | Mystery Shot (gemixt) | Mystery-Aufgabe (harmlose Aufgabe oder 2 Schlucke) |
  | Wasserfall | Prost-Runde (alle trinken 1) |
  | King's Cup: Becher füllen und austrinken | Könige sind Toasts (alle 1), der 4. König: 3 Schlucke |
  | Klatschen: Klatschglas füllen und auf ex | Klatschglas = 2, das 4. = 3 |
  | Pyramide „×2“ (bis 32 Schlucke) | entfällt; „Nehmen oder Verdoppeln“ endet bei 4 |
  | F*ck the Dealer 🤬, Arschloch 💩, Hose runter 👖 | Schlag den Dealer 🎴, Bettler 🃏, Einunddreißig 🎯 |
  | Popo-Klaps 🍑 | High Five 🙌 |
  | Tschick-Flip 🚬, Snus-Wurf | Schachtel-Flip 📦, Dosen-Wurf |

  Dazu sagt die Altersabfrage gleich auf dem ersten Bildschirm: „Jeder Schluck darf auch Wasser oder Softdrink sein.“
  Ein Test (`src/i18n/store.test.ts`) prüft jeden Text der App in beiden Sprachen. Ein neuer Text mit „Shot“, „Ex“
  oder „Arschloch“ fällt dort durch, bis er eine Store-Fassung hat.

## 1. Konten (Du)

| Was | Kosten | Wofür |
| --- | --- | --- |
| [Apple Developer Program](https://developer.apple.com/programs/) | 99 USD/Jahr | App Store, TestFlight |
| [Google Play Console](https://play.google.com/console/signup) | 25 USD einmalig | Google Play |
| [Expo-Konto](https://expo.dev/signup) | kostenlos (begrenzte Builds/Monat) | Builds in der Cloud, Upload in die Stores |
| [AdMob](https://admob.google.com/) | kostenlos | Werbung, Auszahlung |
| [Supabase](https://supabase.com/) | kostenlos (Free Tier) | Backup-Code, geteilte Bretter |

Für Google Play gilt: Neue **private** Entwicklerkonten müssen vor dem ersten Release einen **geschlossenen Test mit
mindestens 12 Testern über 14 Tage** am Stück machen. Plane dafür rund drei Wochen ein.

Beide Stores fragen nach dem **Händlerstatus (EU, DSA)**. Wer mit der App Geld verdient (Werbung), ist in der Regel
Händler. Dann sind Name, Adresse, Telefon und E-Mail im Store öffentlich sichtbar.

## 2. App-Kennung festlegen

In `mobile/app.config.ts` stehen `com.moritzherb.prost` (iOS-Bundle-ID und Android-Paketname) und der Name `prost!`.
Nach dem ersten Release lassen sich beide Kennungen **nicht mehr ändern**. Ändere sie jetzt, falls du etwas anderes willst.
Der Anzeigename im Store muss eindeutig sein. Ist „prost!“ schon vergeben, nimm z. B. „prost! Trinkspiele“.

## 3. Lokal starten und bauen

```bash
npm ci                       # im Repo-Hauptordner
cd mobile && npm ci
npx eas-cli login            # Du: mit deinem Expo-Konto
npx eas-cli init             # legt das Projekt an, gibt eine Projekt-ID aus
```

Die Projekt-ID trägst du in `mobile/app.config.ts` unter `extra.eas.projectId` ein. Alternativ setzt du sie als
Umgebungsvariable `EAS_PROJECT_ID`.

```bash
npm run check                                              # Web-App bauen, Typen prüfen, iOS + Android bündeln
npx eas-cli build --profile development --platform ios     # Entwickler-App fürs eigene iPhone
npx eas-cli build --profile preview --platform android     # APK zum direkt Installieren
```

Expo Go reicht **nicht**: Die App nutzt native Module (AdMob), deshalb brauchst du einen Development-Build. Zum
Testen am eigenen iPhone fragt EAS beim ersten iOS-Build nach deinem Apple-Konto und registriert das Gerät.

## 4. AdMob einrichten (Du)

1. In AdMob **zwei Apps** anlegen, je eine für iOS und Android. Zuerst gibst du an, dass sie noch nicht im Store
   sind. Notiere die **App-IDs** (`ca-app-pub-…~…`).
2. Je App zwei **Anzeigenblöcke** anlegen: *Interstitial* und *Banner* (adaptiv). Notiere die **Block-IDs**
   (`ca-app-pub-…/…`).
3. **Datenschutz & Mitteilungen → DSGVO**: Eine Einwilligungsmitteilung für beide Apps erstellen und
   **veröffentlichen**. Ohne sie zeigt die App in der EU kein Einwilligungsformular, und Google liefert dort kaum
   Werbung aus. Optional für iOS: unter „IDFA-Erläuterung“ eine Vorab-Erklärung zur Apple-Frage.
4. Die IDs in Expo eintragen (expo.dev → Projekt → **Environment variables**, Umgebung *production*, Sichtbarkeit
   „Plain text“):

   | Variable | Wert |
   | --- | --- |
   | `ADMOB_IOS_APP_ID` | iOS-App-ID |
   | `ADMOB_ANDROID_APP_ID` | Android-App-ID |
   | `EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL` | iOS Interstitial-Block |
   | `EXPO_PUBLIC_ADMOB_IOS_BANNER` | iOS Banner-Block |
   | `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL` | Android Interstitial-Block |
   | `EXPO_PUBLIC_ADMOB_ANDROID_BANNER` | Android Banner-Block |
   | `EXPO_PUBLIC_ADS_BANNER` | `off`, wenn du keine Banner willst |

   Ohne diese Variablen und in jedem Development-Build laufen **Googles Test-Anzeigen**. Klick nie auf echte Anzeigen
   in deiner eigenen App: Das gilt als ungültige Zugriffe und kann das AdMob-Konto sperren. Eigene Testgeräte trägst du
   in AdMob unter *Einstellungen → Testgeräte* ein.
5. Nutzt du später **Vermittlung (Mediation)** mit weiteren Werbenetzwerken, gehören deren SKAdNetwork-IDs aus
   [Googles Liste](https://developers.google.com/admob/ios/3p-skadnetworks) in `skAdNetworkItems` in
   `app.config.ts`. Für reines AdMob reicht die eingetragene ID von Google.

## 5. Ad Verification: app-ads.txt (Du)

AdMob prüft, ob die App wirklich dir gehört. Dafür liest es eine Datei `app-ads.txt` im **Hauptverzeichnis der
Website**, die im Store-Eintrag als Entwickler-Website steht. Vorlage: `docs/app-ads.txt`. Darin ersetzt du
`pub-0000000000000000` durch deine Publisher-ID (AdMob → Einstellungen → Kontoinformationen).

**Achtung GitHub Pages:** `https://moritzherb.github.io/GameClaude/app-ads.txt` wird **nicht** gelesen, weil sie in
einem Unterordner liegt. Die Datei muss unter `https://moritzherb.github.io/app-ads.txt` liegen. Am einfachsten geht das so:

1. Neues öffentliches Repo **`moritzherb.github.io`** anlegen.
2. Dort `app-ads.txt` (mit deiner Publisher-ID) und eine kleine `index.html` ablegen, die z. B. auf `/GameClaude/`
   weiterleitet. Dann *Settings → Pages* aktivieren.
3. In **beiden** Store-Einträgen als Website `https://moritzherb.github.io/` eintragen. Bei Google Play heißt das
   Feld „Website“, bei Apple „Marketing-URL“ bzw. „Support-URL“.
4. Ist die App im Store, verknüpfst du sie in AdMob mit dem Store-Eintrag (*App-Einstellungen → App-Store-Details*).
   AdMob crawlt danach (das dauert 24 Stunden oder länger), prüft die App und schaltet sie frei. Bis dahin kommen nur
   wenige Anzeigen.

Mit eigener Domain (z. B. `prost-app.de`) gilt dasselbe: Die Datei gehört nach `https://prost-app.de/app-ads.txt`.

## 6. Supabase einrichten (Du, optional)

Supabase trägt drei Dinge: die **Online-Räume** (Supabase Realtime statt öffentlicher Test-Server), den
„Backup-Code“ und „Brett teilen“. Ohne Supabase läuft die App weiter, dann aber mit den öffentlichen MQTT-Servern
für die Räume und ohne Backup und Teilen. Für die Store-Version solltest du Supabase also einrichten.

1. Projekt anlegen, Region **Frankfurt (eu-central-1)**.
2. *SQL Editor*: den Inhalt von `supabase/migrations/20261103000000_init.sql` ausführen. Alternativ mit der
   Supabase-CLI: `supabase link` und dann `supabase db push`.
3. *Authentication → Sign In / Providers*: **„Allow anonymous sign-ins“** einschalten. Empfohlen gegen Missbrauch:
   unter *Attack Protection* CAPTCHA aktivieren. Das braucht später noch einen Captcha-Token in `cloud.ts`.
4. *Realtime → Settings*: **„Allow public access“** muss an sein. Die Räume nutzen öffentliche Kanäle, und die
   Raum-Codes sind zufällig.
5. *Project Settings → API*: Projekt-URL und den **publishable/anon key** kopieren. Dieser Key ist öffentlich gedacht;
   die Regeln in der Datenbank schützen die Daten. Den Service-Role-Key gibst du **nie** heraus. Eintragen musst du beide Werte an drei Stellen:
   - Website: GitHub-Repo → *Settings → Secrets and variables → Actions → Variables*: `VITE_SUPABASE_URL`,
     `VITE_SUPABASE_ANON_KEY`.
   - App: dieselben zwei Variablen in den Expo Environment variables (production).
   - Lokal: `.env.local` (Vorlage: `.env.example`).

**Kosten der Räume:** Supabase zählt Realtime-Nachrichten. Ein Raum mit 4 Handys braucht im Leerlauf
rund 3 Nachrichten pro Sekunde, mit 8 Handys etwa 10. Im Spiel ersetzen die Spielzüge die „bin noch da“-Meldungen.
Der Free-Plan (2 Mio. Nachrichten/Monat, 200 gleichzeitige Verbindungen) reicht für den Start, etwa für einige
hundert Spielstunden im Monat. Wächst die App, kommt der Pro-Plan (25 USD/Monat, 5 Mio. Nachrichten und 500
Verbindungen inklusive). Die aktuellen Grenzen stehen unter
[supabase.com/pricing](https://supabase.com/pricing). In *Reports → Realtime* siehst du die Nutzung.

## 7. Datenschutzerklärung (Du)

In `public/privacy.html` alle `[ … ]` ausfüllen: Name, Anschrift, E-Mail, Datum und Supabase-Region. Danach wird sie
mit der Website unter `https://moritzherb.github.io/GameClaude/privacy.html` veröffentlicht. Diese URL kommt in beide
Store-Einträge und in AdMob. In der App ist sie unter *Einstellungen → Datenschutz* verlinkt. Die Vorlage ist keine
Rechtsberatung. Lass sie prüfen, vor allem das Impressum, das in Deutschland für Apps mit Werbung Pflicht ist.

## 8. App Store (Du)

```bash
cd mobile
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios          # lädt den Build zu App Store Connect / TestFlight hoch
```

In App Store Connect:

- **Altersfreigabe**: den Fragebogen ehrlich ausfüllen. „Alkohol, Tabak oder Drogen: Konsum oder Verweise“ ist
  *häufig*, das ergibt **18+**.
- **App-Datenschutz** („Datenschutz-Etiketten“): Google AdMob erhebt laut Googles Leitfaden u. a. Geräte-ID,
  Werbedaten, Produktinteraktion, Absturz- und Leistungsdaten sowie den groben Standort (über die IP). Diese Daten
  werden *zum Tracking* genutzt, sofern der Nutzer zustimmt. Prüfe das mit
  [Googles Anleitung](https://developers.google.com/admob/ios/privacy/data-disclosure). Die App selbst sammelt nichts
  weiter. Supabase speichert Backup-Inhalte nur, wenn der Nutzer das will.
- **Hinweise für die Prüfung** (App Review Information → Notes), z. B.:
  > prost! is a party game collection for adults (18+, age check on first start). Every sip can be water or a soft
  > drink – the app says so in Settings → "Play nice". No tobacco content in the app. Ads only appear between games,
  > never during play. No account needed.
- Screenshots für iPhone 6,9″ und 6,5″.

## 9. Google Play (Du)

```bash
npx eas-cli build --profile production --platform android
npx eas-cli submit --platform android     # beim ersten Mal: AAB in der Play Console selbst hochladen
```

In der Play Console:

- **Einstufung** (IARC-Fragebogen): Alkohol-Bezug, kein echtes Glücksspiel. Das ergibt meist USK 16/18 bzw. PEGI 16/18.
- **Zielgruppe**: nur **18+**, also nicht für Kinder.
- **Werbung**: „Ja, meine App enthält Werbung“.
- **Datensicherheit**: Geräte- oder andere IDs, App-Interaktionen und Diagnosedaten werden über das AdMob-SDK erhoben
  und zu Werbezwecken mit Google geteilt. Die Übertragung ist verschlüsselt, und Nutzer können Löschung beantragen
  (Einstellungen → „Meine Daten auf dem Server löschen“). Siehe
  [Googles Angaben zum SDK](https://developers.google.com/admob/android/privacy/play-data-disclosure).
- **Geschlossener Test** mit 12+ Testern über 14 Tage (siehe oben), danach Produktion beantragen.

## 10. Richtlinien-Check

| Regel | Stand in der App |
| --- | --- |
| Apple 1.4.3: kein Tabak, kein Aufruf zu übermäßigem Alkohol | In der App kein Tabak, keine Shots, kein Exen, kein Mixen; höchstens 3 Schlucke am Stück, Pyramide ohne ×2. Altersabfrage 18+ mit „jeder Schluck darf auch Wasser sein“, „Fair bleiben“-Hinweise |
| Apple 4.2: nicht nur eine verpackte Website | Spiele offline im Paket, dazu native Haptik, Teilen, Werbung, Zurück-Taste und Bildschirm an |
| Apple 5.1.2 / ATT | Tracking-Frage vor personalisierter Werbung, Text in `app.config.ts` |
| Apple 5.1.1: Datenschutz-Link in der App | Einstellungen → Datenschutz |
| Apple 2.5.18 / 3.2.2: Werbung | Nicht im Spiel, schließbar, als Werbung erkennbar (Google-Formate) |
| DSGVO / UMP | Einwilligung vor der ersten Anzeigenanfrage, änderbar unter Einstellungen → Werbe-Einstellungen |
| AdMob: Alkohol, Fluchen, Anzügliches | Googles *Publisher Restrictions* begrenzen die Werbung bei „unverantwortlichem Alkoholkonsum“, und viele Werbekunden schließen Fluchen und Anzügliches aus. Genau das ist in der App entschärft (siehe Tabelle oben). Die App fordert Werbung bis Einstufung *MA* an, also für Erwachsene, mit der größten Auswahl an Werbekunden. |
| Store-Texte (Du) | Im Store-Eintrag „Partyspiele für Erwachsene“ schreiben, nicht „sich betrinken“. Screenshots ohne Shots oder Exen. Mehr Werbekunden bekommst du mit der Einwilligung: In AdMob die *IDFA-Erläuterung* für iOS einschalten. |
| AdMob: ungültige Zugriffe | Test-Anzeigen in Entwicklung, nie selbst klicken |
| Google Play: Familien-Richtlinie | Zielgruppe 18+, keine Kinder-Werbung (`tagForChildDirectedTreatment: false`) |

## 11. Was hier automatisch geprüft wird

- `npm test`: Spiel-Logik, Übersetzungen, Store-Variante ohne Tabak, Backup/Codes und die **Datenbank-Regeln**
  (`supabase/tests`: echtes Postgres mit Supabase-Rollen).
- CI-Job „mobile“: Web-App als Einzeldatei bauen, App-Typen prüfen, App für iOS und Android bündeln.

Nicht automatisch geprüft (nur auf echten Geräten möglich): Werbung und Einwilligungsformular in Aktion, Apples
Tracking-Frage, Haptik und Tastatur auf echten Telefonen. Mach deshalb vor dem Release einen Durchgang mit dem
`preview`- oder `development`-Build auf deinem iPhone und einem Android-Handy.
