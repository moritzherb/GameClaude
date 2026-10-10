// Screens, shared components and settings.
const app: Record<string, string> = {
  Language: 'Sprache',
  Settings: 'Einstellungen',

  // Categories (src/games/types.ts)
  Pregame: 'Vorglühen',
  Party: 'Party',
  Quick: 'Schnell',
  Cards: 'Karten',
  Dice: 'Würfel',
  Teams: 'Teams',

  // Age gate
  'No worries.': 'Kein Ding.',
  'Come back when you’re old enough. Juice is great too.': 'Komm wieder, wenn du alt genug bist. Saft ist auch super.',
  'Go back': 'Zurück',
  'Are you of legal drinking age?': 'Bist du alt genug für Alkohol?',
  'Party games for pregames, house parties and everything after.': 'Partyspiele fürs Vorglühen, für Hauspartys und alles danach.',
  'Yes, let’s go': 'Ja, los geht’s',
  'Not yet': 'Noch nicht',

  // Home
  'The crew': 'Die Crew',
  'Tap to edit': 'Antippen & ändern',
  'Who’s playing tonight?': 'Wer spielt heute mit?',
  Shuffle: 'Zufall',
  'We pick, you play': 'Wir wählen, ihr spielt',
  Together: 'Zusammen',
  '{n} phones live': 'Handys live: {n}',
  'Every phone joins': 'Jedes Handy spielt mit',
  'The line-up': 'Das Line-up',
  'Last played': 'Zuletzt gespielt',
  'All games': 'Alle Spiele',
  'Picking your game…': 'Euer Spiel wird ausgewählt…',

  // Library
  All: 'Alle',
  'More games on the way': 'Mehr Spiele sind unterwegs',

  // Game card / detail
  '{n} players': '{n} Spieler',
  'Every phone': 'Alle Handys',
  Soon: 'Bald',
  'No. {n}': 'Nr. {n}',
  Players: 'Spieler',
  Intensity: 'Intensität',
  'Intensity: {level}': 'Intensität: {level}',
  Chill: 'Chillig',
  Tipsy: 'Beschwipst',
  Wild: 'Wild',
  'You’ll need': 'Du brauchst',
  'How to play': 'So geht’s',
  'Coming soon': 'Kommt bald',
  'Add {n} more player': 'Noch {n} Spieler hinzufügen',
  'Add {n} more players': 'Noch {n} Spieler hinzufügen',
  'Max {n} players': 'Max. {n} Spieler',
  'Start game': 'Spiel starten',
  'Play together': 'Zusammen spielen',
  'Back to the game': 'Zurück zum Spiel',
  'Only the host can start it': 'Nur der Host kann starten',
  'Start for everyone in the room': 'Für alle im Raum starten',

  // Play shells
  Rules: 'Regeln',
  'Leave the game?': 'Spiel verlassen?',
  'Leave game': 'Spiel verlassen',
  'The others keep playing. You can come back any time under Play together.':
    'Die anderen spielen weiter. Du kannst jederzeit über „Zusammen spielen“ zurück.',
  'Keep playing': 'Weiterspielen',
  'Quit game': 'Spiel beenden',
  '{game} needs a room': '{game} braucht einen Raum',
  'Every player uses their own phone. Open a room, let everyone join, then start the game from there.':
    'Jeder spielt mit dem eigenen Handy. Öffne einen Raum, lass alle beitreten und starte das Spiel von dort.',
  'Open Play together': 'Zusammen spielen öffnen',
  'Connection lost. Reconnecting…': 'Verbindung weg. Verbinde neu…',
  'End the game for everyone?': 'Spiel für alle beenden?',
  'End game': 'Spiel beenden',

  // Players
  'Party’s full': 'Party ist voll',
  'Add a name': 'Name eingeben',
  'Add player': 'Spieler hinzufügen',
  'Already playing. Try a nickname.': 'Spielt schon mit. Nimm einen Spitznamen.',
  'It’s quiet in here. Add the squad.': 'Ganz schön leer hier. Hol die Truppe dazu.',
  'New avatar for {name}': 'Neuer Avatar für {name}',
  'Remove {name}': '{name} entfernen',
  'Tap again to remove everyone': 'Nochmal tippen, um alle zu entfernen',
  'Remove everyone': 'Alle entfernen',
  Ready: 'Bereit',
  Done: 'Fertig',

  // Room: start
  'Everyone joins the same room with their own phone. One phone hosts, the others scan the QR code or type the room code.':
    'Alle treten mit dem eigenen Handy demselben Raum bei. Ein Handy ist der Host, die anderen scannen den QR-Code oder tippen den Raumcode ein.',
  'This preview can’t connect phones. Open the prost! website (moritzherb.github.io/GameClaude) to play together.':
    'In dieser Vorschau können sich keine Handys verbinden. Öffne die prost!-Website (moritzherb.github.io/GameClaude), um zusammen zu spielen.',
  'New avatar': 'Neuer Avatar',
  'Your name': 'Dein Name',
  'Type your name': 'Gib deinen Namen ein',
  'Join room {code}': 'Raum {code} beitreten',
  'Host my own room instead': 'Lieber eigenen Raum eröffnen',
  'Host a room': 'Raum eröffnen',
  'or join one': 'oder beitreten',
  CODE: 'CODE',
  'Room code': 'Raumcode',
  Join: 'Beitreten',
  'Phones connect directly to each other. Works on the same Wi-Fi or on mobile data. Keep the app open on the host phone.':
    'Die Handys verbinden sich direkt miteinander. Klappt im selben WLAN oder mit mobilen Daten. Lass die App auf dem Host-Handy offen.',

  // Room: lobby
  'Opening the room…': 'Raum wird geöffnet…',
  'Joining {code}…': 'Trete {code} bei…',
  'This takes a few seconds.': 'Dauert nur ein paar Sekunden.',
  Cancel: 'Abbrechen',
  'prost! room': 'prost!-Raum',
  'Join my prost! room: {code}': 'Komm in meinen prost!-Raum: {code}',
  'Your room': 'Dein Raum',
  Room: 'Raum',
  'Connection lost. Reconnecting to the host…': 'Verbindung weg. Verbinde neu mit dem Host…',
  'Room code {code}': 'Raumcode {code}',
  'QR code to join room {code}': 'QR-Code zum Beitreten in Raum {code}',
  'Scan with the camera to join': 'Mit der Kamera scannen und beitreten',
  'Link copied ✓': 'Link kopiert ✓',
  'Share link': 'Link teilen',
  '{n} phone connected': '{n} Handy verbunden',
  '{n} phones connected': '{n} Handys verbunden',
  Host: 'Host',
  You: 'Du',
  Online: 'Online',
  Offline: 'Offline',
  'Waiting for the others to join…': 'Warte auf die anderen…',
  'Cheers!': 'Prost!',
  'Shows up on every phone': 'Erscheint auf jedem Handy',
  'Back to {game}': 'Zurück zu {game}',
  'Games for every phone': 'Spiele für alle Handys',
  Start: 'Los',
  'Or use everyone in the room as the player list for the one-phone games:':
    'Oder nimm alle im Raum als Spielerliste für die Ein-Handy-Spiele:',
  'Use as player list': 'Als Spielerliste nehmen',
  'Waiting for the host to start a game…': 'Warte, bis der Host ein Spiel startet…',
  'Tap again to close the room for everyone': 'Nochmal tippen, um den Raum für alle zu schließen',
  'Tap again to leave': 'Nochmal tippen zum Verlassen',
  'Close room': 'Raum schließen',
  'Leave room': 'Raum verlassen',

  // Room errors (src/net/RoomProvider.tsx)
  'No room with code {code}. Check the code or ask the host to open the room again.':
    'Kein Raum mit dem Code {code}. Check den Code oder bitte den Host, den Raum neu zu öffnen.',
  'This browser can’t connect phones. Open the app in Safari or Chrome (not inside another app).':
    'Dieser Browser kann keine Handys verbinden. Öffne die App in Safari oder Chrome (nicht in einer anderen App).',
  'No connection to the room server. Check your internet and try again.':
    'Keine Verbindung zum Raum-Server. Check dein Internet und versuch’s nochmal.',
  'Something went wrong with the connection. Try again.': 'Mit der Verbindung ist was schiefgelaufen. Versuch’s nochmal.',
  Someone: 'Jemand',
  'The host removed you from the room.': 'Der Host hat dich aus dem Raum geworfen.',
  'The host closed the room.': 'Der Host hat den Raum geschlossen.',
  'Lost the connection to the host. Ask them to keep the app open, then join again.':
    'Verbindung zum Host verloren. Bitte ihn, die App offen zu lassen, und tritt dann nochmal bei.',

  // Settings
  Sounds: 'Töne',
  'Boops, ticks and fanfares': 'Boops, Ticks und Fanfaren',
  Vibration: 'Vibration',
  'Phone buzzes when you tap': 'Handy brummt beim Tippen',
  'Giant Mode': 'Riesenmodus',
  'Everything bigger. For later tonight.': 'Alles größer. Für später am Abend.',
  'Games you know': 'Spiele, die ihr kennt',
  'Switch a game on to skip its tutorials and explanations while you play. The rules stay behind the ? button.':
    'Schalte ein Spiel ein, um beim Spielen Tutorials und Erklärungen zu überspringen. Die Regeln findest du weiter hinter dem ?-Button.',
  'We know it: no explanations': 'Kennen wir: keine Erklärungen',
  'Explanations on': 'Erklärungen an',
  'Play nice': 'Fair bleiben',
  'Every sip can be water or a soft drink. No pressure, ever.': 'Jeder Schluck darf auch Wasser oder Softdrink sein. Kein Druck, niemals.',
  'Eat something before you start.': 'Iss was, bevor’s losgeht.',
  'Never drink and drive – plan your ride home.': 'Nie betrunken fahren – plan deinen Heimweg.',
  'Look out for your mates.': 'Pass auf deine Leute auf.',

  // Shared components
  Back: 'Zurück',
  Close: 'Schließen',
  'Got it': 'Alles klar',
  '{name} says cheers!': '{name} sagt Prost!',
  left: 'übrig',
  '{n} card left in the deck': 'Noch {n} Karte im Stapel',
  '{n} cards left in the deck': 'Noch {n} Karten im Stapel',
  'Face-down card': 'Verdeckte Karte',
  '{rank} of hearts': 'Herz {rank}',
  '{rank} of diamonds': 'Karo {rank}',
  '{rank} of spades': 'Pik {rank}',
  '{rank} of clubs': 'Kreuz {rank}',

  // Who Drinks?
  'Who Drinks?': 'Wer trinkt?',
  'Spin it. Someone’s getting wrecked.': 'Einmal drehen. Einen haut’s gleich um.',
  'Hit SPIN.': 'Drück auf DREHEN.',
  'The wheel lands on someone.': 'Das Rad bleibt bei jemandem stehen.',
  'That person does whatever the screen says.': 'Wen’s trifft, macht, was auf dem Bildschirm steht.',
  'No arguing with the machine. 🤖': 'Mit der Maschine wird nicht diskutiert. 🤖',
  'Rolling…': 'Es dreht sich…',
  'Who’s gonna drink?': 'Wer muss trinken?',
  'Spin again': 'Nochmal drehen',
  Spin: 'Drehen',
  'Drink {n} sip': 'Trink {n} Schluck',
  'Drink {n} sips': 'Trink {n} Schlucke',
  'Give out {n} sips': 'Verteil {n} Schlucke',
  'Finish your drink! 🫗': 'Trink aus! 🫗',
  'Everybody drinks! 🍻': 'Alle trinken! 🍻',
  'Pick a drinking buddy 🤝': 'Such dir einen Trinkpartner 🤝',
  'Safe! Drink water 💧': 'Glück gehabt! Trink Wasser 💧',
  'Drink with no hands 🙌': 'Trink ohne Hände 🙌',
  'Waterfall – you start! 🌊': 'Wasserfall – du fängst an! 🌊',

  // A screen crashed (ErrorBoundary)
  'Oops, something spilled.': 'Hoppla, da ist was verschüttet.',
  'This screen crashed. Your players and settings are safe.': 'Dieser Bildschirm ist abgestürzt. Deine Spieler und Einstellungen sind sicher.',
  'Try again': 'Nochmal versuchen',
  'Back to the start': 'Zurück zum Start',
  'Waiting for the host to start a new game…': 'Warte, bis der Host ein neues Spiel startet…',
  '📱 Each on their own phone': '📱 Jeder auf seinem Handy',
};

export default app;
