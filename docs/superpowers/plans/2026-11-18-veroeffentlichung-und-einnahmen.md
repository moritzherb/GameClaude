# prost! veröffentlichen und Einnahmen erzielen: Plan

> **Für ausführende Agenten:** Nur ein Plan, nichts davon ist umgesetzt. Zum Umsetzen: superpowers:subagent-driven-development oder superpowers:executing-plans, Task für Task. Schritte mit **Du:** kann nur der Inhaber machen (Konten, Zahlungen, Formulare); sie stehen im Plan, damit der kritische Pfad sichtbar ist.

**Ziel:** prost! (Expo-App um die Web-App) in App Store und Google Play bringen und mit Werbung, danach mit einem Einmalkauf „Werbung entfernen“, Geld verdienen.

**Architektur:** `mobile/` zeigt die Web-App offline in einer WebView; Werbung (AdMob) und Einwilligung laufen nativ in `mobile/src/ads.ts`. Online-Räume und Backup laufen über Supabase. Die Store-Fassung entschärft Texte über `src/i18n/store.ts`. Die vollständige Anleitung zu Konten, AdMob, Supabase und Store-Formularen steht in `docs/STORE.md`; dieser Plan sagt, was davon noch offen ist, in welcher Reihenfolge, und was danach für Einnahmen fehlt.

**Tech-Stack:** Expo SDK 58, React Native 0.88, EAS Build/Submit, `react-native-google-mobile-ads`, Supabase, GitHub Pages.

**Spec:** `docs/STORE.md`

## Globale Randbedingungen

- Bundle-ID und Paketname `com.moritzherb.prost` und der Name `prost!` sind nach dem ersten Release nicht mehr änderbar (`mobile/app.config.ts`).
- App ist 18+: `maxAdContentRating: MA`, `tagForChildDirectedTreatment: false`.
- Interstitial nur nach einem Spiel, höchstens alle 4 Minuten, nie in den ersten 3 Minuten; Banner nur in Menüs, nie im Spiel (`mobile/src/config.ts`).
- Echte Werbe-IDs nur über EAS-Umgebungsvariablen; in Development immer Googles Test-Anzeigen; nie auf eigene echte Anzeigen klicken.
- Google Play (privates Entwicklerkonto): geschlossener Test mit mindestens 12 Testern über 14 Tage vor dem ersten Produktions-Release.
- `app-ads.txt` muss unter `https://moritzherb.github.io/app-ads.txt` liegen, nicht unter `/GameClaude/`.
- Neue Texte brauchen Store-Fassung und deutsche Übersetzung (`src/i18n/store.test.ts`, `src/i18n/i18n.test.ts`).

## Review-Fokus

Das hier beißt am ehesten, ohne dass ein Task es von selbst prüft:

1. **Ablehnung wegen Alkohol:** Apple 1.4.3 und Googles Alkohol-Richtlinie sind das größte Risiko für ein Trinkspiel. Erwartet: Review kommt durch, weil die Store-Fassung nur Schlucke und Toasts kennt (Task 4 prüft die Store-Fassung im echten Build).
2. **Datenschutzerklärung stimmt nicht mit der App überein:** Sie nennt noch „Emoji“, die App zeigt Initiale und Farbe; Foto-Upload, Supabase-Region und Werbe-SDK müssen stimmen (Task 3).
3. **Web und App in verschiedenen Räumen:** Fehlen `VITE_SUPABASE_*` auf einer Seite, finden sich Browser und App nicht (Task 2 prüft es).
4. **Einwilligungsformular fehlt oder Reihenfolge falsch:** Erst UMP-Einwilligung, dann ATT, dann SDK (Task 5 prüft das auf einem echten Gerät).
5. **12 Tester nicht erreicht:** Play-Produktion bleibt gesperrt, Launch verschiebt sich um Wochen (Task 6 startet das früh).

---

## Zeitplan und kritischer Pfad

Der Play-Test (14 Tage) und AdMob-Prüfung (24 h oder länger) sind die Wartezeiten. Alles andere läuft parallel. Realistisch ca. 4 Wochen bis zum Launch:

| Woche | Inhalt |
| --- | --- |
| 1 | Task 1 (Konten), Task 2 (Supabase), Task 3 (Recht), Task 4 (Gerätetest) |
| 1–2 | Task 5 (AdMob), Task 6 (Play-Test starten, sobald ein Build da ist) |
| 2–3 | Task 7 (Store-Einträge), Apple-Einreichung |
| 3–4 | Play-Produktion beantragen, Launch, AdMob-Verknüpfung |
| ab Launch | Task 8 (Messen), Task 9 (Werbung entfernen), Task 10 (Wachstum), Task 11 (Betrieb) |

---

## Teil A: Veröffentlichen

### Task 1: Konten und Entscheidungen (Du)

**Files:** Modify `mobile/app.config.ts` (nur falls Name/ID geändert werden)

- [ ] **Du: Konten anlegen:** Apple Developer (99 USD/Jahr), Google Play Console (25 USD einmalig), Expo, AdMob, Supabase. Apple braucht oft 1–2 Tage Freischaltung, deshalb zuerst.
- [ ] **Du: Händlerstatus (DSA)** in beiden Stores angeben. Wer mit Werbung verdient, ist meist Händler; Name, Adresse, Telefon und E-Mail stehen dann öffentlich im Store.
- [ ] **Du: Namen prüfen:** Ist „prost!“ im Store noch frei? Falls nicht, Anzeigename wie „prost! Trinkspiele“ (Bundle-ID bleibt). Entscheiden, **bevor** der erste Build hochgeladen wird.
- [ ] **Du: Gewerbe und Steuern klären** (siehe Task 11), bevor die erste Auszahlung kommt.

### Task 2: Supabase live schalten

**Files:** GitHub-Variablen `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; Expo-Umgebungsvariablen gleichen Namens; Migration `supabase/migrations/20261103000000_init.sql`

- [ ] **Du:** Projekt in Frankfurt anlegen, Migration ausführen, „Allow anonymous sign-ins“ und Realtime „Allow public access“ einschalten (`docs/STORE.md` Abschnitt 6).
- [ ] **Du:** URL und anon key in GitHub (Variables) **und** Expo (production) eintragen, Website neu deployen.
- [ ] **Prüfen:** Ein Raum, der im Browser (Website) erstellt wurde, lässt sich vom `preview`-Build der App betreten und umgekehrt. Erwartung: beide sehen sich in einer Lobby.
- [ ] **Prüfen:** Backup-Code erstellen und auf einem zweiten Gerät einlösen; ein Party-Brett teilen und öffnen.
- [ ] Entscheiden, ob CAPTCHA gegen Missbrauch jetzt oder erst bei Last nötig ist (`docs/STORE.md`: braucht Code in `src/net/cloud.ts`); empfohlen: erst bei Auffälligkeiten.

### Task 3: Datenschutz und Impressum

**Files:** Modify `public/privacy.html`; Modify `docs/STORE.md` (Tabelle mit Emoji-Namen aktualisieren); Test: `npm test`

- [ ] **Du: Alle `[ … ]` in `public/privacy.html` füllen:** Name, Anschrift, E-Mail, Datum, Supabase-Region (Frankfurt). Das Impressum ist für Apps mit Werbung Pflicht.
- [ ] **Code:** Die Wörter „Emoji“/„emoji“ in `public/privacy.html` (Zeilen um 119, 127, 187, 195) durch „Farbe und Anfangsbuchstabe“ ersetzen, weil Avatare keine Emoji mehr sind. Der Foto-Upload bleibt benannt.
- [ ] **Code:** Den Absatz „Nur falls Supabase nicht eingerichtet ist“ entfernen, sobald Task 2 erledigt ist (die Store-Version läuft nur mit Supabase).
- [ ] **Du: Prüfen lassen** (Anwalt oder Datenschutz-Dienst); die Vorlage ist keine Rechtsberatung.
- [ ] **Verifikation:** Nach dem Deploy öffnet `https://moritzherb.github.io/GameClaude/privacy.html` ohne eckige Klammern: `curl -s <URL> | grep -c "\["` liefert nur Treffer aus Skript/CSS, keinen Platzhalter mehr.

### Task 4: Test auf echten Geräten

**Files:** `mobile/app.config.ts` (`extra.eas.projectId`), Env-Variablen in Expo

- [ ] **Du:** `npx eas-cli login`, `npx eas-cli init`, Projekt-ID in `mobile/app.config.ts` oder als `EAS_PROJECT_ID` setzen.
- [ ] **Build:** `npm run check` (im Ordner `mobile/`), dann `npx eas-cli build --profile development --platform ios` und `--profile preview --platform android`.
- [ ] **Prüfliste auf iPhone und Android (jeweils mit Test-Anzeigen):**
  - Altersabfrage erscheint, Text „Jeder Schluck darf auch Wasser sein“.
  - In der Store-Fassung kommen in keinem Spiel „Shot“, „Ex“, „Arschloch“ vor (Stichprobe: Party, Kings Cup, Klatschen, Bus Driver Pyramide).
  - Offline-Start (Flugmodus): Spiele laufen.
  - Online-Raum mit zwei Geräten (Task 2).
  - Haptik, Bildschirm bleibt im Spiel an, Android-Zurück, Teilen.
  - Interstitial erst nach einem Spiel, nie in den ersten 3 Minuten; Banner nur im Menü.
  - EU-Einwilligung erscheint vor der ersten Anzeige; iPhone fragt danach nach Tracking.
  - Party-Brett mit 3D-Icons läuft flüssig auf einem älteren Gerät.
- [ ] **Hinweis:** Die Leisten-Synchronisation (`src/lib/themeColor.ts`) betrifft nur die PWA im Standalone-Modus; in der Store-App gilt sie nicht, dort nur die Statusleisten-Farbe der WebView prüfen.

### Task 5: AdMob einrichten und verifizieren

**Files:** `docs/app-ads.txt` (Vorlage); neues Repo `moritzherb.github.io` mit `app-ads.txt` und `index.html`; Expo-Variablen laut `docs/STORE.md` Abschnitt 4

- [ ] **Du:** Zwei Apps (iOS, Android) und je Interstitial- und adaptiven Banner-Block anlegen; die sechs IDs plus `ADMOB_*_APP_ID` in Expo (production) eintragen.
- [ ] **Du:** DSGVO-Einwilligungsmitteilung für beide Apps **veröffentlichen**; ohne sie kaum Anzeigen in der EU.
- [ ] **Du:** Neues öffentliches Repo `moritzherb.github.io` mit `app-ads.txt` (`google.com, pub-<deine-ID>, DIRECT, f08c47fec0942fa0`) und Weiterleitung auf `/GameClaude/`; Pages aktivieren.
- [ ] **Verifikation:** `curl -s https://moritzherb.github.io/app-ads.txt` zeigt die Zeile mit deiner Publisher-ID.
- [ ] Nach Store-Veröffentlichung: App in AdMob mit dem Store-Eintrag verknüpfen, 24 h bis mehrere Tage auf die Prüfung warten.

### Task 6: Google Play, geschlossener Test (früh starten)

- [ ] **Du:** 12+ Tester sammeln (Freunde, Familie, Reddit/Discord-Gruppen für Play-Tests), deren Google-Konten in der Play Console eintragen.
- [ ] **Build:** `npx eas-cli build --profile production --platform android`; AAB beim ersten Mal selbst in der Play Console hochladen, Track „Geschlossener Test“.
- [ ] **Du:** 14 Tage am Stück laufen lassen; Tester müssen die App installiert haben und opt-in bleiben. Danach Produktion beantragen.
- [ ] Bis dahin zählt jeder Tag: Dieser Task zuerst starten, sobald Task 4 einen stabilen Build hat. Zwischen Test und Produktion dürfen noch Fixes nachgereicht werden.

### Task 7: Store-Einträge und Einreichung

**Files:** (neu) `docs/store-listing.md` für Texte; (neu) `mobile/store/screenshots/` für Bilder

- [ ] **Texte:** Name, Untertitel, Beschreibung, Stichwörter auf Deutsch und Englisch. Wortwahl „Partyspiele für Erwachsene“, nicht „sich betrinken“ (`docs/STORE.md` Abschnitt 10).
- [ ] **Screenshots:** iPhone 6,9″ und 6,5″, Android-Handy; ohne Shots oder Exen. Mit der vorhandenen Web-App und Playwright (iPhone-Gerät, `deviceScaleFactor: 2`) erzeugbar: Home, Party-Brett, Mäxchen, Kings Cup, Online-Raum.
- [ ] **Du: Formulare:** App Store: Altersfreigabe (Fragebogen ehrlich, ergibt 18+), Datenschutz-Etiketten laut AdMob-Leitfaden, Hinweise für die Prüfung (Text steht in `docs/STORE.md` Abschnitt 8). Play: IARC-Einstufung, Zielgruppe nur 18+, „enthält Werbung“, Datensicherheit.
- [ ] **Build und Upload (iOS):** `npx eas-cli build --profile production --platform ios`, dann `npx eas-cli submit --platform ios`; über TestFlight ein Durchgang, dann zur Prüfung einreichen.
- [ ] **Bei Ablehnung** (Apple 1.4.3 oder 4.2): Begründung lesen, im Review-Hinweis auf Altersabfrage, Wasser-Option und fehlende Tabak/Shot-Inhalte verweisen; bei Wiederholung weitere Begriffe in `src/i18n/store.ts` entschärfen (Test `src/i18n/store.test.ts` lockt das ab).

---

## Teil B: Einnahmen

### Task 8: Werbung als Basis messen (nach Launch)

- [ ] **Du:** In AdMob nach Launch Auszahlungsdaten (Steuerinfo, Bank) eintragen; Schwelle für die erste Auszahlung prüfen.
- [ ] **Messen:** AdMob-Bericht (Impressionen, eCPM, Fill-Rate), App Store Connect und Play Console (Installs, aktive Nutzer, Bewertungen). Ohne eigene Analyse-Software reichen diese drei für den Anfang; wer Analytics ergänzt, muss Datenschutzerklärung und Store-Etiketten anpassen.
- [ ] **Grobe Erwartung** (Annahmen, keine Zusagen; nach 4 Wochen Realdaten gegenprüfen): Pro aktiver Nutzer und Tag etwa 1–2 Interstitials. Bei 1.000 täglichen Nutzern und einem angenommenen eCPM von 3–8 EUR ergibt das grob 100–400 EUR im Monat. Trinkspiele sind für Werbekunden schwierig (Alkohol-Einschränkungen), deshalb eher am unteren Ende rechnen. Mit weniger als etwa 500 täglichen Nutzern lohnt Werbung allein kaum.
- [ ] **Stellschrauben, falls es zu wenig wird:** Mediation mit weiteren Netzwerken (dann `skAdNetworkItems` in `mobile/app.config.ts` ergänzen), Belohnte Anzeigen für ein Extra (Task 9), Intervall in `mobile/src/config.ts` (`minGapMs`) nur mit Vorsicht senken: zu viel Werbung kostet Bewertungen.

### Task 9: „Werbung entfernen“ als Einmalkauf (In-App-Kauf)

Apple und Google verlangen für digitale Güter ihre eigene Kaufabwicklung. Empfehlung: ein Einmalkauf (z. B. 2,99–4,99 EUR), kein Abo; das passt zu einer Party-App, die man selten, aber im Kreis nutzt.

**Files:**
- Create: `mobile/src/purchases.ts`
- Modify: `mobile/src/ads.ts`, `mobile/App.tsx`, `mobile/src/bridge.ts`, `src/lib/native.ts`, `src/screens/Settings.tsx`, `src/i18n/de/` (neue Strings)
- Test: `mobile/src/purchases.test.ts` (Logik) und `src/lib/native.test.ts`

**Interfaces:**
- Produces: `isPro(): Promise<boolean>`, `buyPro(): Promise<'ok' | 'cancelled' | 'error'>`, `restorePurchases(): Promise<boolean>` in `mobile/src/purchases.ts`; Bridge-Nachrichten `pro` (App → Web: `{ pro: boolean }`) und `buyPro` / `restore` (Web → App).
- Consumes: `startAds()` aus `mobile/src/ads.ts`; die Bridge aus `mobile/src/bridge.ts`.

- [ ] **Du:** In App Store Connect und Play Console ein Nicht-Verbrauchs-Produkt `pro` anlegen (Preis, Name, Beschreibung), Bank- und Steuerformulare für bezahlte Apps ausfüllen.
- [ ] **Entscheiden:** RevenueCat (SDK `react-native-purchases`, kostenlos bis zu einem Monatsumsatz von rund 2.500 USD, prüfen) oder `expo-iap` direkt. Empfehlung: RevenueCat, weil Wiederherstellen und Belege geprüft sind.
- [ ] **Test schreiben:** `shouldShowAds(pro: boolean, consentReady: boolean): boolean` liefert `false`, wenn `pro` wahr ist, und sonst `consentReady`; zusätzlich ein Test, dass ein erfolgreicher Kauf `isPro()` auf `true` setzt (Mock des SDK).
- [ ] **Implementieren:** `purchases.ts` mit den drei Funktionen; `ads.ts` zeigt Interstitial und Banner nicht, wenn `isPro()`; Einwilligungsformular bleibt unverändert (der Kauf ersetzt es nicht).
- [ ] **Web-Seite:** In `Settings.tsx` eine Zeile „Werbung entfernen“ (Preis aus der App) und „Käufe wiederherstellen“; beides nur sichtbar in der App (`src/lib/native.ts` kennt den Zustand). Texte mit deutscher Übersetzung, Test `src/i18n/i18n.test.ts` grün.
- [ ] **Prüfen:** Sandbox-Kauf auf iPhone (Sandbox-Tester) und Android (Lizenztester): Banner und Interstitial verschwinden, nach Neuinstallation stellt „Wiederherstellen“ den Zustand her, die Werbe-Einstellungen (Einwilligung) bleiben erreichbar.
- [ ] **Du:** Datenschutz-Etiketten und Datenschutzerklärung um den Kauf ergänzen (Käufe laufen über Apple/Google/RevenueCat).

### Task 10: Nutzer gewinnen (ohne Nutzer keine Einnahmen)

- [ ] **Web als Trichter:** Die Website (GitHub Pages) bleibt kostenlos spielbar. Ein dezenter Hinweis „Als App holen“ mit Store-Links erst nach dem Launch einbauen; Raum-QR-Codes (Freunde ohne App spielen im Browser mit) sind die vorhandene Verbreitungsschleife.
- [ ] **Store-Auffindbarkeit:** Stichwörter und Untertitel pro Sprache; die ersten 3 Screenshots tragen die Verkaufsbotschaft; Bewertungen früh erbitten (nach einem gewonnenen Spiel, nicht beim Start).
- [ ] **Kurzvideos:** TikTok/Reels/Shorts mit echten Spielszenen (Party-Brett, Mäxchen-Aufdecken); der natürliche Kanal für Trinkspiele. Die Higgsfield-Anbindung hat aktuell nur 0,1 Credits, also eigene Aufnahmen verwenden.
- [ ] **Saison:** Starttermin vor Silvester oder Ostern/Pfingsten/Sommer legen; Partyspiele haben Spitzen vor Feiertagen und am Wochenende.

### Task 11: Betrieb, Steuern, Kosten

- [ ] **Du: Gewerbe/Steuern:** Einnahmen aus Werbung und Käufen sind in der Regel gewerblich: Gewerbeanmeldung und Finanzamt (Kleinunternehmerregelung prüfen); Steuerformulare bei Apple, Google, AdMob; Beratung durch Steuerberater einholen. Keine Rechtsberatung aus diesem Plan.
- [ ] **Kosten im Blick:** Apple 99 USD/Jahr, Supabase Free-Plan reicht nach `docs/STORE.md` für etwa 170 Stunden Vierer-Runden im Monat; Pro-Plan ab 25 USD/Monat, sobald Realtime-Nachrichten oder Verbindungen die Grenzen erreichen (Supabase → Reports → Realtime wöchentlich ansehen).
- [ ] **Support:** Eine E-Mail-Adresse (steht im Impressum), Bewertungen in beiden Stores beantworten, Abstürze in Play Console (Android vitals) und Xcode Organizer beobachten.
- [ ] **Updates:** Jede neue Spielidee durch `src/i18n/store.test.ts` führen, bevor sie in die Store-Fassung geht; Releases über `eas build` + `eas submit` (Versionsnummer in `mobile/app.config.ts` hochzählen).

---

## Selbst-Check gegen die Spec

- Spec-Abschnitte 1–9 aus `docs/STORE.md` sind abgedeckt: Konten (Task 1), Kennung (1), Build (4), AdMob (5), `app-ads.txt` (5), Supabase (2), Datenschutz (3), App Store (7), Google Play (6, 7); Richtlinien-Check (Review-Fokus 1, Task 4/7).
- Offen und bewusst nicht im Plan: Mediation mit weiteren Netzwerken, Abo-Modelle, Analyse-Software (jeweils Task 8 als spätere Stellschraube genannt).
- Typen und Namen von Task 9 (`isPro`, `buyPro`, `restorePurchases`) kommen nur in Task 9 vor.
