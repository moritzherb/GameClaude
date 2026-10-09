// German translations for this game. Keys are the exact English text.
// The game keeps its English name in German, and so does the word "Dealer".
const fuckTheDealer: Record<string, string> = {
  // Game info (index.ts)
  'F*ck the Dealer': 'F*ck the Dealer',
  'Guess the card. Every hit goes on the dealer’s tab.': 'Errate die Karte. Jeder Treffer geht auf den Deckel vom Dealer.',
  'Pick a dealer. They hold the deck and peek at the top card.': 'Bestimmt einen Dealer. Er hält den Stapel und schaut sich die oberste Karte an.',
  'The player on the dealer’s left guesses its value, 2 to Ace. The suit doesn’t matter.':
    'Der Spieler links vom Dealer rät ihren Wert, von 2 bis Ass. Die Farbe ist egal.',
  'Right on the first guess: the dealer saves up 6 sips.': 'Beim ersten Versuch richtig: Der Dealer sammelt 6 Schlucke.',
  'Wrong: the dealer says if the card is higher or lower, and the player guesses once more. Right now: the dealer saves up 3 sips. Wrong again: nobody drinks.':
    'Falsch: Der Dealer sagt, ob die Karte darüber oder darunter liegt, und der Spieler rät noch einmal. Jetzt richtig: Der Dealer sammelt 3 Schlucke. Wieder falsch: Keiner trinkt.',
  'Either way the card goes face up into the middle, piled by value from 2 to Ace. Once all four of a value are out, that pile is turned over.':
    'So oder so kommt die Karte offen in die Mitte, nach Wert gestapelt von 2 bis Ass. Sind alle vier eines Werts draußen, wird der Stapel umgedreht.',
  'Then the next player to the left guesses the next card.': 'Dann rät der nächste Spieler links die nächste Karte.',
  'After 3 players in a row miss, the dealer drinks all the sips they saved up and passes the deck to their left. The new dealer goes on with the player after the last one who guessed.':
    'Liegen 3 Spieler hintereinander daneben, trinkt der Dealer alle gesammelten Schlucke und gibt den Stapel nach links weiter. Der neue Dealer macht beim Spieler nach dem weiter, der zuletzt geraten hat.',
  'When the deck is empty, the last dealer drinks what they saved up. Game over.':
    'Ist der Stapel leer, trinkt der letzte Dealer, was er gesammelt hat. Spiel vorbei.',

  // Setup
  'Who’s the dealer?': 'Wer ist der Dealer?',
  'The dealer holds the deck and peeks at the top card. Everyone else guesses, starting on the dealer’s left.':
    'Der Dealer hält den Stapel und schaut sich die oberste Karte an. Alle anderen raten, angefangen links vom Dealer.',
  'Random dealer': 'Zufälliger Dealer',

  // Playing
  'Dealer · {n} sips saved': 'Dealer · {n} Schlucke gesammelt',
  'Dealer · 1 sip saved': 'Dealer · 1 Schluck gesammelt',
  'Dealer: hold to peek': 'Dealer: halten zum Spicken',
  'Which card?': 'Welche Karte?',
  'It’s higher ⬆': 'Darüber ⬆',
  'It’s lower ⬇': 'Darunter ⬇',
  'Your guess: {rank}. Last try!': 'Dein Tipp: {rank}. Letzter Versuch!',
  'Guess the value, the suit doesn’t matter.': 'Rate den Wert, die Farbe ist egal.',
  '{n} of 3 misses in a row': '{n} von 3 Fehlversuchen in Folge',
  'misses in a row': 'daneben in Folge',
  '{n} of 4 out': '{n} von 4 draußen',
  'Bullseye!': 'Volltreffer!',
  '{name} saves 6 sips.': '{name} sammelt 6 Schlucke.',
  'Got it!': 'Erwischt!',
  '{name} saves 3 sips.': '{name} sammelt 3 Schlucke.',
  'Missed!': 'Daneben!',
  'Nobody drinks.': 'Keiner trinkt.',
  'Third miss in a row: the deck moves on.': 'Dritter Fehlversuch in Folge: Der Stapel wandert weiter.',
  'Pass the deck →': 'Stapel weitergeben →',

  // Dealer change and game over
  'Dealer change': 'Dealerwechsel',
  '{name} drinks up': '{name} trinkt aus',
  '{name} gets away': '{name} kommt davon',
  sip: 'Schluck',
  sips: 'Schlucke',
  'Everything saved up as dealer, all at once.': 'Alles, was sich als Dealer angesammelt hat, auf einmal.',
  'Not a single sip saved up. Lucky.': 'Kein einziger Schluck gesammelt. Glück gehabt.',
  'New dealer': 'Neuer Dealer',
  '{name} takes the deck': '{name} übernimmt den Stapel',
  'Drunk as dealer': 'Als Dealer getrunken',
  '1 sip': '1 Schluck',
  '{n} sips': '{n} Schlucke',
};

export default fuckTheDealer;
