// Arschloch (the bluffing game; the trick game is President)
const arschloch: Record<string, string> = {
  'Lie about your cards. Don’t end up with four Jacks.': 'Lüg über deine Karten. Erwisch bloß nicht alle vier Buben.',
  'Everyone joins the same room on their own phone. 32 cards (7 to Ace) lie face down in a circle, like in Kings Cup. The pile goes in the middle.':
    'Alle treten mit dem eigenen Handy demselben Raum bei. 32 Karten (7 bis Ass) liegen verdeckt im Kreis, wie bei Kings Cup. In die Mitte kommt der Ablagestapel.',
  'On your turn, with no cards in your hand, draw one from the circle and look at it. Nobody else may see it.':
    'Bist du dran und hast keine Handkarten, ziehst du eine Karte aus dem Kreis und schaust sie an. Kein anderer darf sie sehen.',
  'Lay it face down on the pile and say what it is: the same value as the card before or higher. You may lie.':
    'Leg sie verdeckt auf den Stapel und sag an, was sie ist: denselben Wert wie die Karte davor oder höher. Du darfst lügen.',
  'Cards in your hand? Then you play one of those instead. You only draw from the circle again once your hand is empty.':
    'Hast du Handkarten, legst du stattdessen eine davon. Erst wenn deine Hand leer ist, ziehst du wieder aus dem Kreis.',
  'Only the next player may turn the card before over, before they play. A lie: the liar takes the whole pile. The truth: whoever turned it over takes it.':
    'Nur der nächste Spieler darf die Karte davor aufdecken, bevor er selbst legt. Gelogen: Der Lügner nimmt den ganzen Stapel. Gestimmt: Wer aufgedeckt hat, nimmt ihn.',
  'Whoever takes the pile drinks a sip for every card in it and is up next, and anything goes again.':
    'Wer den Stapel nimmt, trinkt einen Schluck pro Karte und ist als Nächstes dran. Es ist wieder alles erlaubt.',
  'Four of a value in your hand go out of the game, face down beside it. Whoever lays them down hands out 2 sips.':
    'Vier Gleiche auf der Hand sind raus aus dem Spiel und kommen verdeckt daneben. Wer sie ablegt, verteilt 2 Schlucke.',
  'Whoever ends up with all four Jacks is the Asshole: empty your glass. The game is over.':
    'Wer alle vier Buben auf der Hand hat, ist das Arschloch: Glas leer trinken. Das Spiel ist aus.',
  'Waiting for {name} to lay out the circle…': 'Warte, bis {name} den Kreis auslegt …',
  'Waiting for the host to start…': 'Warte, bis der Host startet …',
  '2 to 8 players, 32 cards': '2 bis 8 Spieler, 32 Karten',
  'Each player on their own phone. Lie about your cards, catch the liars, and don’t end up with all four Jacks.':
    'Jeder am eigenen Handy. Lüg über deine Karten, erwisch die Lügner und lande bloß nicht bei allen vier Buben.',
  'The order of the room is the order at the table. Everyone else in the room watches.':
    'Die Reihenfolge im Raum ist die Reihenfolge am Tisch. Alle anderen im Raum schauen zu.',
  'At least 2 players': 'Mindestens 2 Spieler',
  'Lay out the circle': 'Kreis auslegen',
  '{name} draws a card from the circle.': '{name} zieht eine Karte aus dem Kreis.',
  '{name} lays down: “{rank}”.': '{name} legt ab: „{rank}“.',
  '{name} turns it over: a {card}, not a {claim}! {liar} takes {n} and drinks {n}.':
    '{name} deckt auf: eine {card}, keine {claim}! {liar} nimmt {n} und trinkt {n}.',
  '{name} turns it over: it really is a {card}. {name} takes {n} and drinks {n}.':
    '{name} deckt auf: Es ist wirklich eine {card}. {name} nimmt {n} und trinkt {n}.',
  '{name} lays down four {rank}s and hands out {n}.': '{name} legt vier {rank} ab und verteilt {n}.',
  '{name} has all four Jacks!': '{name} hat alle vier Buben!',
  'Empty your glass!': 'Glas leer!',
  'Nothing to play: turn it over!': 'Nichts zu legen: Deck auf!',
  'Believe it and draw, or turn it over': 'Glauben und ziehen, oder aufdecken',
  'Draw a card from the circle': 'Zieh eine Karte aus dem Kreis',
  'Believe it and play, or turn it over': 'Glauben und legen, oder aufdecken',
  'Lay a card down and say what it is': 'Leg eine Karte ab und sag an, was sie ist',
  'Say {rank} or higher. You may lie.': 'Sag {rank} oder höher an. Du darfst lügen.',
  '{n} in the pile': '{n} im Stapel',
  Pile: 'Stapel',
  'Out: {ranks}': 'Raus: {ranks}',
  'Tap a card in the circle. Only you get to see it.': 'Tipp eine Karte im Kreis an. Nur du siehst sie.',
  'No cards in your hand: next turn you draw from the circle.': 'Keine Handkarten: Nächstes Mal ziehst du aus dem Kreis.',
  'Say what it is': 'Sag an, was sie ist',
  'Pick a card': 'Wähl eine Karte',
  'Lay down as {rank}': 'Als {rank} ablegen',
  'Liar! 🔍': 'Lügner! 🔍',
  'True!': 'Stimmt!',
  'Said {claim}': 'Angesagt: {claim}',
  '{name} takes {n}': '{name} nimmt {n}',
  'You’re the Asshole!': 'Du bist das Arschloch!',
  '{name} is the Asshole!': '{name} ist das Arschloch!',
  'All four Jacks. Empty your glass!': 'Alle vier Buben. Glas leer!',
  'Caught lying, and the pile held the last Jack.': 'Beim Lügen erwischt, und im Stapel lag der letzte Bube.',
  'Turned over the truth, and the pile held the last Jack.': 'Die Wahrheit aufgedeckt, und im Stapel lag der letzte Bube.',
  'The host starts the next game.': 'Der Host startet das nächste Spiel.',
  'Ended up the Asshole': 'Arschloch geworden',
};

export default arschloch;
