// German translations for this game. Keys are the exact English text.
const trash: Record<string, string> = {
  // Game info (index.ts)
  Trash: 'Trash',
  'Turn your ten cards over first. Then do it with nine.': 'Deck als Erster deine zehn Karten auf. Dann das Ganze mit neun.',
  'A duel for two. Each player gets 10 face-down cards in two rows: slots Ace to 5 on top, 6 to 10 below. The rest is the stock.':
    'Ein Duell zu zweit. Jeder bekommt 10 verdeckte Karten in zwei Reihen: oben die Plätze Ass bis 5, unten 6 bis 10. Der Rest ist der Stapel.',
  'The dealer deals the other player first, and that player starts.': 'Der Dealer teilt beim anderen Spieler zuerst aus, und der fängt an.',
  'On your turn, take the top card of the stock, or the top of the discard pile if you can use it.':
    'Wenn du dran bist, nimm die oberste Karte vom Stapel, oder die oberste vom Ablagestapel, wenn du sie brauchen kannst.',
  'A Jack is wild: put it into any face-down slot. Queens and Kings are useless.':
    'Ein Bube ist ein Joker: Er darf auf jeden verdeckten Platz. Damen und Könige sind Nieten.',
  'A card you can’t use goes on the discard pile, and it’s the other player’s turn.':
    'Eine Karte, die du nicht brauchen kannst, kommt auf den Ablagestapel, und der andere ist dran.',
  'Turn all your slots over first to win the round. Next round the winner gets one card fewer and deals, so the loser starts.':
    'Wer zuerst alle Plätze aufgedeckt hat, gewinnt die Runde. In der nächsten Runde bekommt der Gewinner eine Karte weniger und gibt, also fängt der Verlierer an.',
  'Win a round with just one card and you win the game.': 'Wer eine Runde mit nur noch einer Karte gewinnt, gewinnt das Spiel.',

  // Setup
  'Who deals first?': 'Wer gibt zuerst?',
  'A duel for two. Put the phone between you: the top half is for the player opposite.':
    'Ein Duell zu zweit. Legt das Handy zwischen euch: Die obere Hälfte ist für den Spieler gegenüber.',

  // Playing
  '{name}: draw a card': '{name}: Karte ziehen',
  'Take the discard': 'Vom Ablagestapel nehmen',
  'Tap the stock. Or the discard pile, if you can use its card.': 'Tipp auf den Stapel. Oder auf den Ablagestapel, wenn du die Karte brauchen kannst.',

  // Round over
  'Round {n}': 'Runde {n}',
  '{name} wins the game!': '{name} gewinnt das Spiel!',
  '{name} wins the round!': '{name} gewinnt die Runde!',
  'Next round: {a} plays {x} cards, {b} plays {y}.': 'Nächste Runde: {a} spielt mit {x} Karten, {b} mit {y}.',
  'Got the real card for a slot where a Jack lies? Swap them: the card goes in, and you play the Jack again.':
    'Du hast die echte Karte für einen Platz, auf dem ein Bube liegt? Tausch sie aus: Die Karte kommt auf den Platz, und du spielst den Buben nochmal.',
  'Drag a card face up into its own slot if that slot is still face down. The card that lay there turns over: play it the same way, and so on.':
    'Zieh eine Karte aufgedeckt auf ihren Platz, wenn er noch verdeckt ist. Die Karte, die dort lag, wird umgedreht: Spiel sie genauso, und so weiter.',
  'Drag the card onto its slot': 'Zieh die Karte auf ihren Platz',
  'Jack! Drag it onto any face-down slot': 'Bube! Zieh ihn auf einen beliebigen verdeckten Platz',
  'No use: drag it onto the discard pile': 'Bringt nichts: Zieh sie auf den Ablagestapel',
  'Swap it for your Jack, or drag it onto the discard pile': 'Tausch sie gegen deinen Buben oder zieh sie auf den Ablagestapel',
  'Not there: a {rank} goes into slot {slot}': 'Nicht dort: Eine {rank} gehört auf Platz {slot}',
  'That one is already face up': 'Die liegt schon offen',
  'That’s not your side': 'Das ist nicht deine Seite',
  'You can still use this card': 'Die Karte kannst du noch brauchen',
  'You can only take it if you can use it': 'Nur nehmen, wenn du sie brauchen kannst',
  'Discard pile': 'Ablagestapel',
};

export default trash;
