// German translations for this game. Keys are the exact English text.
const palace: Record<string, string> = {
  Palace: 'Palace',
  'Same or higher. First one out of cards wins.': 'Gleich oder höher. Wer zuerst keine Karten mehr hat, gewinnt.',
  'Everyone joins the same room on their own phone. The host’s phone lies in the middle as the table. One deck of 52 cards, 2 to 5 players.':
    'Alle treten mit dem eigenen Handy demselben Raum bei. Das Handy des Hosts liegt als Tisch in der Mitte. Ein Deck mit 52 Karten, 2 bis 5 Spieler.',
  'Dealt one at a time, starting left of the dealer: three face-down cards each, then six hand cards. Everyone lays three of their hand cards face up on their face-down ones.':
    'Es wird einzeln ausgeteilt, beginnend links vom Geber: erst drei verdeckte Karten für jeden, dann sechs Handkarten. Jeder legt drei seiner Handkarten aufgedeckt auf seine verdeckten Karten.',
  'Starting left of the dealer, play one card or several of the same value onto the pile: the same value or higher. While the stock lasts, draw back up to three hand cards.':
    'Links vom Geber geht’s los: Leg eine Karte oder mehrere mit demselben Wert auf den Ablagestapel – gleich oder höher. Solange der Stapel reicht, ziehst du wieder auf drei Handkarten auf.',
  'Can’t play? Take the whole pile, or risk it: the top card of the stock goes on the pile. If it fits, you got lucky. If not, you take the pile and that card.':
    'Du kannst nicht legen? Nimm den ganzen Ablagestapel auf oder riskier es: Die oberste Karte vom Stapel kommt auf den Ablagestapel. Passt sie, hast du Glück gehabt. Wenn nicht, nimmst du den Ablagestapel samt dieser Karte auf.',
  'Once the stock is gone and your hand is empty, play your face-up cards, then your face-down ones, blind, one at a time. If one doesn’t fit, you take the pile and have to play your hand first again.':
    'Ist der Stapel leer und deine Hand auch, spielst du deine aufgedeckten Karten, danach die verdeckten – blind, eine nach der anderen. Passt eine nicht, nimmst du den Ablagestapel auf und musst erst wieder deine Hand loswerden.',
  '2, 3 and 10 can always be played, and so can four of a kind.': '2, 3 und 10 kann man immer legen, vier gleiche Karten auch.',
  '7: the next player has to play 7 or lower. After that it’s 7 or higher again. A 7 only goes on 7 or lower.':
    '7: Der Nächste muss 7 oder niedriger legen. Danach geht es wieder ab 7 aufwärts weiter. Eine 7 darf nur auf 7 oder niedriger.',
  '10 or four of a kind: the pile is cleared away. Draw up and play again.': '10 oder vier Gleiche: Der Ablagestapel wird verbrannt. Aufziehen und nochmal legen.',
  '2: start again from 2. The pile stays, and you play again without drawing first.':
    '2: Es geht wieder ab 2 los. Der Ablagestapel bleibt liegen, und du legst nochmal, ohne vorher zu ziehen.',
  '3: copies the card it lies on, specials too. On a 7 the next player plays 7 or lower, on a 2 you play again.':
    '3: spiegelt die Karte, auf der sie liegt – auch Spezialkarten. Auf einer 7 muss der Nächste 7 oder niedriger legen, auf einer 2 legst du nochmal.',
  'The first player with no cards left wins.': 'Wer zuerst keine Karten mehr hat, gewinnt.',

  'Get rid of all your cards: first your hand, then the three face-up cards, then the three face-down ones, blind.':
    'Werde alle Karten los: erst deine Hand, dann die drei aufgedeckten, dann die drei verdeckten Karten – blind.',
  'Anything goes': 'Alles geht',
  '7 or lower': '7 oder niedriger',
  '{rank} or higher': '{rank} oder höher',
  'The pile is cleared!': 'Der Ablagestapel ist verbrannt!',
  '{name} plays {cards}.': '{name} legt {cards}.',
  '{name} risked it: {card} fits!': '{name} hat riskiert: {card} passt!',
  '{name} risked it: {card} doesn’t fit. Takes the pile ({n} cards).': '{name} hat riskiert: {card} passt nicht. Nimmt den Ablagestapel auf ({n} Karten).',
  '{name} turned over {card}: it fits!': '{name} deckt {card} auf: passt!',
  '{name} turned over {card}: no luck. Takes the pile ({n} cards).': '{name} deckt {card} auf: kein Glück. Nimmt den Ablagestapel auf ({n} Karten).',
  '{name} takes the pile ({n} cards).': '{name} nimmt den Ablagestapel auf ({n} Karten).',
  '{name} goes again': '{name} legt nochmal',
  '{n} in hand': '{n} auf der Hand',
  'Choosing…': 'Wählt aus…',
  'Stock · {n}': 'Stapel · {n}',
  'Pile · {n}': 'Ablage · {n}',
  'Everyone picks their face-up cards': 'Alle wählen ihre aufgedeckten Karten',
  'Cleared away: {n}': 'Verbrannt: {n}',
  'Choose your face-up cards on your phone': 'Wählt eure aufgedeckten Karten auf dem Handy',
  'Waiting for the others… ({n} still choosing)': 'Warte auf die anderen… ({n} wählen noch)',
  'Pick 3 cards to lay face up': 'Wähl 3 Karten zum Aufdecken',
  'Usually your best: high cards, 2s, 3s and 10s. You play them once your hand is gone.':
    'Meist deine besten: hohe Karten, 2er, 3er und 10er. Du spielst sie, sobald deine Hand leer ist.',
  'Lay them face up': 'Aufgedeckt hinlegen',
  '{n} of 3 picked': '{n} von 3 gewählt',
  'Go again!': 'Nochmal legen!',
  'You can’t play': 'Du kannst nicht legen',
  'Turn over a face-down card': 'Deck eine verdeckte Karte auf',
  'Hand empty: play your face-up cards': 'Hand leer: Spiel deine aufgedeckten Karten',
  'Hand empty: play your face-down cards, blind': 'Hand leer: Spiel deine verdeckten Karten, blind',
  'Tap one of your face-down cards. If it doesn’t fit, you take the pile.': 'Tipp auf eine deiner verdeckten Karten. Passt sie nicht, nimmst du den Ablagestapel auf.',
  'Play {cards}': '{cards} legen',
  'Pick cards': 'Karten wählen',
  'Pick one or more cards of one value': 'Wähl eine oder mehrere Karten mit gleichem Wert',
  'Take the pile ({n})': 'Ablage aufnehmen ({n})',
  'Risk it 🎲': 'Riskieren 🎲',
  'Risk it: the top card of the stock goes on the pile. If it doesn’t fit, you take the pile and that card.':
    'Riskieren: Die oberste Karte vom Stapel kommt auf den Ablagestapel. Passt sie nicht, nimmst du den Ablagestapel samt dieser Karte auf.',
  'You may risk it any time while the stock lasts, even if you could play: that way you keep your good cards.':
    'Riskieren darfst du immer, solange der Stapel reicht – auch wenn du legen könntest. So sparst du deine guten Karten.',
  'Four of the same value in a row on the pile clear it too, also when played one after the other (Q, Q, Q, then the fourth Q). A 3 in between breaks the row.':
    'Liegen vier gleiche Werte direkt hintereinander auf dem Ablagestapel, wird er ebenfalls verbrannt – auch wenn sie nacheinander gelegt wurden (Dame, Dame, Dame, dann die vierte Dame). Eine 3 dazwischen unterbricht die Reihe.',
  'Cleared!': 'Verbrannt!',
  'Doesn’t fit: you take the pile': 'Passt nicht: Du nimmst den Ablagestapel auf',
  'The pile is cleared! Go again.': 'Ablagestapel verbrannt! Nochmal legen.',
  'It fits!': 'Passt!',
  'Everyone plays on their own phone': 'Alle spielen auf ihrem eigenen Handy',
  'Table phone in the middle': 'Tisch-Handy in der Mitte',
  'Off: you play too. Every phone shows the stock, the pile and the others’ table cards.':
    'Aus: Du spielst mit. Jedes Handy zeigt Stapel, Ablagestapel und die ausliegenden Karten der anderen.',
  'This phone shows the pile and everyone’s face-up cards. Everyone else plays on their own phone.':
    'Dieses Handy zeigt den Ablagestapel und die aufgedeckten Karten aller Spieler. Alle anderen spielen auf ihrem eigenen Handy.',
  'No spare phone for the table? Switch the table phone off: the host plays too, and every phone shows the stock and the pile.':
    'Kein Handy übrig für den Tisch? Schalte das Tisch-Handy aus: Der Host spielt mit, und jedes Handy zeigt Stapel und Ablagestapel.',
  'Every player’s phone (plus one for the table, if you like)': 'Jedes Spieler-Handy (plus eins als Tisch, wenn ihr wollt)',
};

export default palace;
