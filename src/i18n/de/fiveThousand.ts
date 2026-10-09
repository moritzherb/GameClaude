// German translations for this game. Keys are the exact English text.
const fiveThousand: Record<string, string> = {
  // Game info (index.ts)
  '5000': '5000',
  'Kings and Aces. Hit exactly 5000.': 'Könige und Asse. Triff genau 5000.',
  'Five dice with 9, 10, J, Q, K and A, rolled from a cup. Pick who starts, then the cup goes round to the left.':
    'Fünf Würfel mit 9, 10, B, D, K und A, gewürfelt aus dem Becher. Bestimmt, wer anfängt, dann geht der Becher nach links weiter.',
  'Kings are worth 50, Aces 100. Three of a kind in one roll: 9s 100, 10s 200, Jacks 300, Queens 400, Kings 500, Aces 1000.':
    'Ein König zählt 50, ein Ass 100. Drilling in einem Wurf: 9er 100, 10er 200, Buben 300, Damen 400, Könige 500, Asse 1000.',
  'After every roll, set aside at least one King, Ace or triple. Then roll the rest again, or stop and bank this turn’s points.':
    'Nach jedem Wurf legst du mindestens einen König, ein Ass oder einen Drilling zur Seite. Dann würfelst du mit dem Rest weiter oder hörst auf und schreibst dir die Punkte gut.',
  'A roll with no King, no Ace and no triple ends your turn, and all of this turn’s points are gone.':
    'Ein Wurf ohne König, Ass oder Drilling beendet deinen Zug, und alle Punkte aus diesem Zug sind weg.',
  'If every die has scored, put all five back in the cup and keep going. The points keep adding up.':
    'Haben alle Würfel Punkte gebracht, kommen alle fünf zurück in den Becher und es geht weiter. Die Punkte zählen zusammen.',
  'To get in, you need at least 500 in one turn. Until then you can’t stop below 500.':
    'Zum Einstieg brauchst du mindestens 500 in einem Zug. Bis dahin kannst du nicht unter 500 aufhören.',
  'Once you’re in, a first roll with nothing to set aside costs 300 points (you can’t go below 0).':
    'Bist du drin, kostet ein erster Wurf ohne Punkte 300 Punkte (weniger als 0 geht nicht).',

  // Dice faces: German poker dice say B (Bube) and D (Dame)
  J: 'B',
  Q: 'D',
  K: 'K',
  A: 'A',

  // Setup
  'Who starts?': 'Wer fängt an?',
  'Then the cup goes round to the left. First to exactly 5000 wins.': 'Dann geht der Becher nach links weiter. Wer zuerst genau 5000 hat, gewinnt.',
  Starts: 'Fängt an',
  'Random pick': 'Zufällig wählen',

  // Playing
  '{score} · {left} to go': '{score} · noch {left}',
  'Not in yet · needs 500': 'Einstieg: 500 nötig',
  'this turn': 'dieser Zug',
  'Tap the cup to roll': 'Tipp auf den Becher',
  'Roll the dice': 'Würfeln',
  'Set aside': 'Zur Seite gelegt',
  'All 5 again 🔥': 'Alle 5 nochmal 🔥',
  'Roll 1 die': '1 Würfel würfeln',
  'Roll {n} dice': '{n} Würfel würfeln',
  'Pick your dice': 'Würfel wählen',
  'Tap Kings, Aces or a triple to set them aside.': 'Tipp Könige, Asse oder einen Drilling an, um sie zur Seite zu legen.',
  'That’s over 5000. Pick less.': 'Das wäre über 5000. Nimm weniger.',
  '+{n} points': '+{n} Punkte',
  'Take all': 'Alle nehmen',
  'Exactly 5000! 🏆': 'Genau 5000! 🏆',
  'All 5 back in the cup 🔥': 'Alle 5 nochmal 🔥',
  'Roll 1 die again': 'Mit 1 Würfel weiter',
  'Roll {n} again': 'Mit {n} Würfeln weiter',
  'Stop · bank {n}': 'Stopp · {n} gutschreiben',
  'Stop from 500 · {n} to go': 'Stopp ab 500 · noch {n}',

  // End of a turn
  '+{n} banked': '+{n} gutgeschrieben',
  '{name} is in with {score}.': '{name} ist drin mit {score}.',
  '{name} now has {score}.': '{name} hat jetzt {score}.',
  'Over 5000!': 'Über 5000!',
  'Nothing!': 'Nichts dabei!',
  'First roll without points: −{n}.': 'Erster Wurf ohne Punkte: −{n}.',
  '{n} points from this turn are gone.': '{n} Punkte aus diesem Zug sind weg.',
  'No King, no Ace, no triple.': 'Kein König, kein Ass, kein Drilling.',
  '{name} stays on {score}.': '{name} bleibt bei {score}.',

  // Game over
  'Exactly 5000!': 'Genau 5000!',
  'Final scores': 'Endstand',
  'A triple is exactly three of a kind: four or five of a kind are none (four Kings are just four Kings). A triple only goes aside as a whole.':
    'Ein Drilling sind genau drei Gleiche: Vier oder fünf Gleiche sind keiner (vier Könige sind einfach vier Könige). Ein Drilling kommt nur komplett zur Seite.',
  'First to exactly 5000 wins. If a roll brings more than you still need, the turn is over and its points are gone: you can’t take just part of it.':
    'Wer zuerst genau 5000 hat, gewinnt. Bringt ein Wurf mehr, als dir noch fehlt, ist der Zug vorbei und seine Punkte sind weg – du kannst nicht nur einen Teil davon nehmen.',
  'If a roll brings exactly what you need, you’ve won, without picking anything.': 'Bringt ein Wurf genau die fehlenden Punkte, hast du gewonnen – ohne etwas auszuwählen.',
  'The roll is worth {value}, you needed {need}.': 'Der Wurf bringt {value}, dir fehlten {need}.',
};

export default fiveThousand;
