// German translations for this game. Keys are the exact English text.
const horseRace: Record<string, string> = {
  // Game info (index.ts)
  'Horse Race': 'Pferderennen',
  'Bet on an Ace. Pray it gallops.': 'Setz auf ein Ass. Und bete, dass es galoppiert.',
  'The four Aces are the horses, side by side at the start. Next to the track lies one face-down card per row (you pick how many rows).':
    'Die vier Asse sind die Pferde, nebeneinander am Start. Neben der Bahn liegt pro Reihe eine verdeckte Karte (wie viele Reihen, stellt ihr ein).',
  'Everyone bets on a suit: its Ace is your horse.': 'Jeder setzt auf eine Farbe: Ihr Ass ist dein Pferd.',
  'Turn over the rest of the deck card by card. Each card moves the Ace of its suit up one row.':
    'Der Rest vom Stapel wird Karte für Karte aufgedeckt. Jede Karte bringt das Ass ihrer Farbe eine Reihe nach vorne.',
  'The first Ace into a row turns that row’s side card over, and the Ace of its suit moves up too, before the next card from the deck.':
    'Das erste Ass in einer Reihe deckt die Seitenkarte dieser Reihe auf, und das Ass ihrer Farbe rückt ebenfalls vor, bevor die nächste Karte vom Stapel kommt.',
  'Whoever bet on the Ace that turned the side card over gives out sips: as many as the row number.':
    'Wer auf das Ass gesetzt hat, das die Seitenkarte aufgedeckt hat, verteilt Schlucke: so viele wie die Nummer der Reihe.',
  'The first Ace past the top row wins. Its backers drink nothing; everyone else drinks one sip for every row their horse is behind.':
    'Das erste Ass über die oberste Reihe hinaus gewinnt. Wer darauf gesetzt hat, trinkt nichts. Alle anderen trinken einen Schluck pro Reihe, die ihr Pferd zurückliegt.',

  // Bets
  'Place your bets': 'Setzt eure Wetten',
  'Everyone picks a suit. Its Ace is your horse. If it doesn’t win, you drink.':
    'Jeder wählt eine Farbe. Ihr Ass ist dein Pferd. Gewinnt es nicht, trinkst du.',
  'Random for the rest': 'Zufällig für den Rest',
  'Track length': 'Länge der Bahn',
  rows: 'Reihen',
  'And they’re off!': 'Und los geht’s!',
  'Everyone needs a horse': 'Jeder braucht ein Pferd',

  // The race
  'First past row {n} wins': 'Wer zuerst über Reihe {n} kommt, gewinnt',
  'Row {row}: side card!': 'Reihe {row}: Seitenkarte!',
  '{suit} moves up': '{suit} zieht vor',
  '{names} give out {n} sips': '{n} Schlucke verteilen: {names}',
  'The first Ace into a row turns its side card over.': 'Das erste Ass in einer Reihe deckt ihre Seitenkarte auf.',
  'On your marks…': 'Auf die Plätze…',
  'Turn the side card': 'Seitenkarte aufdecken',
  'Next card': 'Nächste Karte',
  'Auto ⏸': 'Auto ⏸',
  'Auto ▶': 'Auto ▶',
  '{suit}: row {n}': '{suit}: Reihe {n}',

  // Finish
  'Photo finish': 'Zielfoto',
  '{suit} wins!': '{suit} gewinnt!',
  '{names} bet right and drink nothing.': 'Richtig gesetzt, nichts trinken: {names}.',
  'Nobody bet on it. Everyone drinks!': 'Keiner hat darauf gesetzt. Alle trinken!',
  'Drink up': 'Trinken',
  'One sip for every row your horse is behind.': 'Ein Schluck pro Reihe, die dein Pferd zurückliegt.',
  'Race again': 'Nochmal rennen',
};

export default horseRace;
