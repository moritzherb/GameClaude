// German translations for this game. Keys are the exact English text.
const horseRace: Record<string, string> = {
  // Game info (index.ts)
  'Horse Race': 'Pferderennen',
  'Bet on an Ace. Pray it gallops.': 'Setz auf ein Ass. Und bete, dass es galoppiert.',
  'The four Aces are the horses, side by side at the start. Next to the track lies one face-down card per row (you pick how many rows).':
    'Die vier Asse sind die Pferde, nebeneinander am Start. Neben der Bahn liegt pro Reihe eine verdeckte Karte (wie viele Reihen, stellt ihr ein).',
  'Everyone bets on a suit (its Ace is your horse) and stakes a number of sips on it.':
    'Jeder setzt auf eine Farbe (das Ass dieser Farbe ist dein Pferd) und setzt eine Anzahl Schlucke darauf.',
  'Turn over the rest of the deck card by card. Each card moves the Ace of its suit up one row.':
    'Der Rest vom Stapel wird Karte für Karte aufgedeckt. Jede Karte bringt das Ass ihrer Farbe eine Reihe nach vorne.',
  'The first Ace into a row turns that row’s side card over, and the Ace of its suit moves up too, before the next card from the deck.':
    'Das erste Ass in einer Reihe deckt die Seitenkarte dieser Reihe auf, und das Ass ihrer Farbe rückt ebenfalls vor, bevor die nächste Karte vom Stapel kommt.',
  'Whoever bet on the Ace that turned the side card over gives out sips: as many as the row number.':
    'Wer auf das Ass gesetzt hat, das die Seitenkarte aufgedeckt hat, verteilt Schlucke: so viele wie die Nummer der Reihe.',
  'The first Ace past the top row wins. Its backers give out twice the sips they staked; everyone else drinks their stake.':
    'Das erste Ass über die oberste Reihe hinaus gewinnt. Wer darauf gesetzt hat, verteilt doppelt so viele Schlucke, wie er gesetzt hat. Alle anderen trinken ihren Einsatz.',

  // Bets
  'Place your bets': 'Macht eure Einsätze',
  'Everyone picks a suit and stakes sips on it. If its Ace wins, you give out double. If not, you drink your stake.':
    'Jeder wählt eine Farbe und setzt Schlucke darauf. Gewinnt ihr Ass, verteilst du das Doppelte. Sonst trinkst du deinen Einsatz.',
  'Fewer sips': 'Weniger Schlucke',
  'More sips': 'Mehr Schlucke',
  'Stake of {name}': 'Einsatz von {name}',
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
  '{names} give out {n} sip': '{n} Schluck verteilen: {names}',
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
  '{names} bet right and give out double.': 'Richtig gesetzt, das Doppelte verteilen: {names}.',
  'Give out': 'Verteilen',
  'Nobody bet on it. Everyone drinks!': 'Keiner hat darauf gesetzt. Alle trinken!',
  'Drink up': 'Trinken',
  'Winners give out twice their stake, everyone else drinks theirs.':
    'Die Gewinner verteilen das Doppelte ihres Einsatzes, alle anderen trinken ihren Einsatz.',
  'Race again': 'Neues Rennen',
};

export default horseRace;
