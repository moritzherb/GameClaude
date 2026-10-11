// German translations for this game. Keys are the exact English text.
const schweinerei: Record<string, string> = {
  // Game info (index.ts)
  Schweinerei: 'Schweinerei',
  'Two little pigs. Know when to stop.': 'Zwei Schweinchen. Wer gierig wird, verliert.',
  'Throw the two little pigs. How they land scores. Keep throwing to add up your turn, or put the points in the pen and hand on.':
    'Wirf die zwei Schweinchen. Wie sie landen, bringt Punkte. Wirf weiter, um sie zu sammeln, oder bring sie in den Stall und gib weiter.',
  'How one pig can land: on its side (0), on its back (5), standing (5), on its snout (10), on snout and ear (25). Two pigs add up: a mixed double.':
    'So kann ein Schwein liegen: Faule Sau (auf der Seite, 0), Suhle (auf dem Rücken, 5), Haxe (stehend, 5), Schnauze (10), Schnauze mit Stütze (Schnauze und Ohr, 25). Zwei Schweine werden addiert: ein Gemischtes Doppel.',
  'Both on the same side: 1 point. On different sides (one with the dot up, one without): pig out! This turn’s points are gone and you drink 1.':
    'Beide auf derselben Seite: Sau, 1 Punkt. Auf verschiedenen Seiten (eins mit dem Punkt oben, eins ohne): Faule Sau! Die Punkte dieser Runde sind weg, und du trinkst 1.',
  'Both the same is a double and counts four times: back or standing 20, snout 40, snout and ear 100. A double lets you give out sips (2, 4 or 6).':
    'Beide gleich ist ein Doppel und zählt vierfach: Volle Suhle 20, Doppelhaxe 20, Volle Schnauze 40, beide mit Stütze 100. Bei einem Doppel verteilst du Schlucke (2, 4 oder 6).',
  'The pigs touch (about 1 throw in 100): every point you collected is gone, drink 2. One lands on top of the other: all your points are gone, drink up.':
    'Berühren sich die Schweine (Sauhaufen, etwa jeder 100. Wurf): alle deine gesammelten Punkte sind weg, trink 2. Liegt eins auf dem anderen (Schweinerei): alle Punkte weg, ex!',
  'Every turn has a bonus throw, e.g. 3 × on the back: get that many pigs that way within your turn and its bonus points are added.':
    'Jede Runde hat einen Bonus-Wurf, z. B. 3 × Suhle: Schaffst du so viele Schweine in dieser Lage in deiner Runde, gibt es die Bonuspunkte dazu.',
  'How often a pig lands each way: on its side 65 %, on its back 22 %, standing 9 %, on its snout 3 %, on snout and ear 0.6 %.':
    'So oft landet ein Schwein: Faule Sau 65 %, Suhle 22 %, Haxe 9 %, Schnauze 3 %, Schnauze mit Stütze 0,6 %.',
  'First to 100 wins. Everyone else drinks a sip for every 10 points they’re short.':
    'Wer zuerst 100 hat, gewinnt. Alle anderen trinken pro 10 fehlende Punkte einen Schluck.',

  // Setup
  'Then the pigs go round to the left. First to 100 wins.': 'Dann gehen die Schweinchen reihum nach links. Wer zuerst 100 hat, gewinnt.',

  // Poses and throws
  Side: 'Faule Sau',
  'Side (dot)': 'Faule Sau (Punkt)',
  Razorback: 'Suhle',
  Trotter: 'Haxe',
  Snouter: 'Schnauze',
  'Leaning Jowler': 'Schnauze mit Stütze',
  'Double Razorback': 'Volle Suhle',
  'Double Trotter': 'Doppelhaxe',
  'Double Snouter': 'Volle Schnauze',
  'Double Leaning Jowler': 'Doppelte Schnauze mit Stütze',
  'Pig out!': 'Faule Sau!',
  'Makin’ Bacon!': 'Sauhaufen!',
  'Mixed double': 'Gemischtes Doppel',
  'Bonus throw! {what}: +{n}': 'Bonus-Wurf! {what}: +{n}',
  'Bonus throw: {what} for +{n}': 'Bonus-Wurf: {what} für +{n}',
  Bonus: 'Bonus',
  'Bonus throw': 'Bonus-Wurf',
  'Get {what} within this turn: every pig counts, over all your throws until you put the points in the pen. Then +{n} points on top, once. Every turn has a new target.':
    'Schaff {what} in dieser Runde: Jedes Schwein zählt, über alle deine Würfe, bis du die Punkte in den Stall bringst. Dann gibt es einmal +{n} Punkte dazu. Jede Runde gibt es ein neues Ziel.',
  'So far this turn: {count} of {target}.': 'Bisher in dieser Runde: {count} von {target}.',
  'Piggyback!': 'Schweinerei!',
  Sider: 'Sau',
  '+{n} · give out {s} sips': '+{n} · verteile {s} Schlucke',
  '+{n}': '+{n}',
  'This turn’s points are gone. Drink 1.': 'Die Punkte dieser Runde sind weg. Trink 1.',
  'The pigs touch: all your points are gone. Drink 2.': 'Die Schweine berühren sich: alle deine Punkte sind weg. Trink 2.',
  'One on top of the other: all your points are gone. Drink up!': 'Eins auf dem anderen: alle deine Punkte sind weg. Ex!',

  // The table
  'In the pen: {n}': 'Im Stall: {n}',
  Scores: 'Punkte',
  'Into the pen: +{n}': 'In den Stall: +{n}',

  'And throw!': 'Und werfen!',
  'That wasn’t a throw. Swing up and let go!': 'Das war kein Wurf. Mit Schwung nach oben und loslassen!',
  'Pick up the pigs and throw them': 'Schweinchen nehmen und werfen',
  'Pick up the pigs, swing up and let go': 'Schweinchen nehmen, nach oben schwingen und loslassen',
  Pen: 'Stall',
  'Throw again, or put your points in the pen (bottom right)': 'Nochmal werfen, oder Punkte in den Stall bringen (rechts unten)',
  'Grab the pigs and throw them up the table': 'Schnapp dir die Schweinchen und wirf sie über den Tisch',

  // Finish
  '{n} points': '{n} Punkte',
  'Everyone else drinks a sip for every 10 points they’re short.': 'Alle anderen trinken pro 10 fehlende Punkte einen Schluck.',
};

export default schweinerei;
