// German translations for this game. Keys are the exact English text.
const pantsDown: Record<string, string> = {
  // Game info (index.ts)
  'Pants down': 'Hose runter',
  'Three cards, one suit, don’t be lowest.': 'Drei Karten, eine Farbe – bloß nicht Letzter werden.',
  'Every player’s phone': 'Ein Handy pro Spieler',
  'Everyone joins the same room on their own phone. The host’s phone lies in the middle as the table. Cards 7 to Ace, three each.':
    'Alle treten mit dem eigenen Handy demselben Raum bei. Das Handy vom Host liegt als Tisch in der Mitte. Karten von 7 bis Ass, drei für jeden.',
  'Points: add up the cards of ONE suit. 7–10 = face value, J/Q/K = 10, Ace = 11.':
    'Punkte: Zähl die Karten EINER Farbe zusammen. 7–10 = Augenwert, Bildkarten (J/Q/K) = 10, Ass = 11.',
  'The dealer looks at their three first: keep them (three more go to the middle) or put them in the middle and play the next three.':
    'Der Geber schaut sich zuerst seine drei an: behalten (drei weitere kommen in die Mitte) oder in die Mitte legen und die nächsten drei spielen.',
  'Starting left of the dealer: swap one card with the middle, swap all three, or say STOP. No Stop in the first round.':
    'Links vom Geber geht’s los: eine Karte mit der Mitte tauschen, alle drei tauschen oder STOPP sagen. In der ersten Runde gibt’s kein Stopp.',
  'Optional for big groups: passing (“schieben”) instead of swapping, switched on before dealing.':
    'Optional für große Runden: Schieben statt Tauschen, wird vor dem Austeilen eingeschaltet.',
  'After a Stop everyone else gets one more turn, then all cards are shown.':
    'Nach einem Stopp sind alle anderen noch einmal dran, dann kommen alle Karten auf den Tisch.',
  '31 in one suit = Pants down 👖 and three aces = Fire 🔥: the round ends at once.':
    '31 in einer Farbe = Hose runter 👖 und drei Asse = Feuer 🔥: Die Runde ist sofort vorbei.',
  'Any other three of a kind = 30½.': 'Drei Gleiche (außer Asse) = 30½.',
  'Lowest points loses a life (ties all lose). 5 lives each.':
    'Wer die wenigsten Punkte hat, verliert ein Leben (bei Gleichstand alle). Jeder hat 5 Leben.',
  'The first to hit zero gets one extra life (everyone who hits zero in that same round does). After that, zero means you’re out.':
    'Wer als Erstes auf null fällt, bekommt ein Extraleben (alle, die in derselben Runde auf null fallen). Danach heißt null: Du bist raus.',
  'If the last players would all go out at once, nobody does: they play a decider round. Last one standing wins.':
    'Würden die letzten Spieler alle gleichzeitig rausfliegen, fliegt keiner: Sie spielen eine Entscheidungsrunde. Wer übrig bleibt, gewinnt.',

  // Lobby
  'Waiting for {name} to deal…': 'Warte, bis {name} austeilt…',
  'Waiting for the host to deal…': 'Warte, bis der Host austeilt…',
  'This phone is the table': 'Dieses Handy ist der Tisch',
  'Put this phone in the middle: it shows the middle cards. Everyone else plays on their own phone.':
    'Leg dieses Handy in die Mitte: Es zeigt die Karten in der Mitte. Alle anderen spielen auf ihrem eigenen Handy.',
  '{name}’s turn': '{name} ist dran',
  'Tap your cards to pick them up.': 'Tipp auf deine Karten, um sie aufzunehmen.',
  'Put them down': 'Weglegen',
  'Everyone sees only their own cards. Collect points in one suit, don’t end up lowest. {lives} lives each.':
    'Jeder sieht nur seine eigenen Karten. Sammle Punkte in einer Farbe und werd bloß nicht Letzter. {lives} Leben pro Person.',
  'Max {max} players. The first {max} play.': 'Maximal {max} Spieler. Die ersten {max} spielen mit.',
  'Turn order is the order above. A random player deals first.':
    'Gespielt wird in der Reihenfolge oben. Ein zufälliger Spieler gibt zuerst.',
  'Allow passing': 'Schieben erlauben',
  'House rule for big groups: skip your turn instead of swapping (“schieben”).':
    'Hausregel für große Runden: Statt zu tauschen darfst du schieben und einfach aussetzen.',
  'Waiting for players…': 'Warte auf Spieler…',
  'Deal the cards': 'Karten austeilen',

  // Table
  'You’re dealing. Keep these cards?': 'Du gibst. Behältst du die Karten?',
  '{name} deals and checks their cards…': '{name} gibt und checkt die Karten…',
  'Last turn! Swap one or all.': 'Letzter Zug! Tausch eine oder alle.',
  'Your turn!': 'Du bist dran!',
  '{name} is swapping…': '{name} tauscht…',
  'Round {round} · {name} deals': 'Runde {round} · {name} gibt',
  'You said STOP': 'Du hast Stopp gesagt',
  '{name} said STOP': '{name} hat Stopp gesagt',
  Middle: 'Mitte',
  'Your cards': 'Deine Karten',
  '{points} points': '{points} Punkte',
  'You’re out. Watch the others finish.': 'Du bist raus. Schau zu, wie die anderen fertig spielen.',
  'You’re watching this game.': 'Du schaust bei diesem Spiel zu.',
  'Reconnecting…': 'Verbinde neu…',
  'Keep these': 'Behalten',
  'Put them in the middle': 'Ab in die Mitte',
  'In the middle, you must play the next three cards instead, whatever they are.':
    'Legst du sie in die Mitte, musst du die nächsten drei spielen – egal, was kommt.',
  'Swap {mine} ↔ {middle}': '{mine} ↔ {middle} tauschen',
  'Tap one of your cards and one in the middle to swap.': 'Tipp eine deiner Karten und eine aus der Mitte an, um zu tauschen.',
  Pass: 'Schieben',
  'Swap all 3': 'Alle 3 tauschen',
  'Stop after round 1': 'Stopp erst nach Runde 1',
  'Stop called': 'Stopp gesagt',
  Stop: 'Stopp',
  Fire: 'Feuer',
  D: 'G',
  You: 'Du',
  out: 'raus',
  '{n} lives': '{n} Leben',

  // Last move
  Someone: 'Jemand',
  'You kept the first cards.': 'Du hast die ersten Karten behalten.',
  '{name} kept the first cards.': '{name} hat die ersten Karten behalten.',
  'You put the first cards in the middle.': 'Du hast die ersten Karten in die Mitte gelegt.',
  '{name} put the first cards in the middle.': '{name} hat die ersten Karten in die Mitte gelegt.',
  'You swapped all three.': 'Du hast alle drei getauscht.',
  '{name} swapped all three.': '{name} hat alle drei getauscht.',
  'You passed.': 'Du hast geschoben.',
  '{name} passed.': '{name} hat geschoben.',
  'You said STOP. Everyone else gets one more turn.': 'Du hast Stopp gesagt. Alle anderen sind noch einmal dran.',
  '{name} said STOP. Everyone else gets one more turn.': '{name} hat Stopp gesagt. Alle anderen sind noch einmal dran.',
  'You swapped {gave} for {took}.': 'Du hast {gave} gegen {took} getauscht.',
  '{name} swapped {gave} for {took}.': '{name} hat {gave} gegen {took} getauscht.',

  // Reveal
  'You win!': 'Du gewinnst!',
  '{name} wins!': '{name} gewinnt!',
  'Nobody survived!': 'Keiner hat überlebt!',
  '🔥 Fire from You!': '🔥 Feuer von dir!',
  '🔥 Fire from {name}!': '🔥 Feuer von {name}!',
  '👖 Pants down from You!': '👖 Hose runter von dir!',
  '👖 Pants down from {name}!': '👖 Hose runter von {name}!',
  'Cards on the table!': 'Karten auf den Tisch!',
  'Tie at the end! {names} stay in on one life and play a decider round.':
    'Gleichstand am Ende! {names} bleiben mit einem Leben drin und spielen eine Entscheidungsrunde.',
  '{names} lose a life.': '{names} verlieren ein Leben.',
  'You lose a life.': 'Du verlierst ein Leben.',
  '{name} loses a life.': '{name} verliert ein Leben.',
  'Game over': 'Spiel vorbei',
  'Round {round}': 'Runde {round}',
  'Out 💀': 'Raus 💀',
  'Extra life! ♥': 'Extraleben! ♥',
  'New game': 'Neues Spiel',
  'Next round →': 'Nächste Runde →',
  'Waiting for the host…': 'Warte auf den Host…',
  'Waiting for the host to deal the next round…': 'Warte, bis der Host die nächste Runde austeilt…',
};

export default pantsDown;
