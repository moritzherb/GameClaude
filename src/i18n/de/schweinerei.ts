// German translations for this game. Keys are the exact English text.
const schweinerei: Record<string, string> = {
  // Game info (index.ts)
  Schweinerei: 'Schweinerei',
  'Two little pigs. Know when to stop.': 'Zwei Schweinchen. Wer gierig wird, verliert.',
  'Throw the two little pigs. How they land scores. Keep throwing to add up your turn, or put the points in the pen and hand on.':
    'Wirf die zwei Schweinchen. Wie sie landen, bringt Punkte. Wirf weiter, um sie zu sammeln, oder bring sie in den Stall und gib weiter.',
  'How one pig can land: on its side (0), on its back (5), standing (5), on its snout (10), on snout and ear (15). Two pigs add up: a mixed double.':
    'So kann ein Schwein liegen: Faule Sau (auf der Seite, 0), Suhle (auf dem Rücken, 5), Haxe (stehend, 5), Schnauze (10), Backe (Schnauze und Ohr, 15). Zwei Schweine werden addiert: ein Gemischtes Doppel.',
  'Every turn has a bonus throw, e.g. 3 × on the back: get that many pigs that way within your turn and its bonus points are added.':
    'Jede Runde hat einen Bonus-Wurf, z. B. 3 × Suhle: Schaffst du so viele Schweine in dieser Lage in deiner Runde, gibt es die Bonuspunkte dazu.',
  'How often a pig lands each way: on its side 65 %, on its back 22 %, standing 9 %, on its snout 3 %, on snout and ear 0.6 %.':
    'So oft landet ein Schwein: Faule Sau 65 %, Suhle 22 %, Haxe 9 %, Schnauze 3 %, Backe 0,6 %.',

  // Setup
  'Then the pigs go round to the left. First to 100 wins.': 'Dann gehen die Schweinchen reihum nach links. Wer zuerst 100 hat, gewinnt.',

  // Poses and throws
  Side: 'Faule Sau',
  'Side (dot)': 'Faule Sau (Punkt)',
  Razorback: 'Suhle',
  Trotter: 'Haxe',
  Snouter: 'Schnauze',
  'Leaning Jowler': 'Backe',
  'Double Razorback': 'Volle Suhle',
  'Double Trotter': 'Doppelhaxe',
  'Double Snouter': 'Volle Schnauze',
  'Double Leaning Jowler': 'Doppelbacke',
  'Pig out!': 'Faule Sau!',
  'Makin’ Bacon!': 'Sauhaufen!',
  'Mixed double': 'Gemischtes Doppel',
  'Bonus throw! {what}: +{n}': 'Bonus-Wurf! {what}: +{n}',
  'Bonus throw: {what} for +{n}': 'Bonus-Wurf: {what} für +{n}',
  'Bonus throw': 'Bonus-Wurf',
  'Get {what} within this turn: every pig counts, over all your throws until you put the points in the pen. Then +{n} points on top, once. Every turn has a new target.':
    'Schaff {what} in dieser Runde: Jedes Schwein zählt, über alle deine Würfe, bis du die Punkte in den Stall bringst. Dann gibt es einmal +{n} Punkte dazu. Jede Runde gibt es ein neues Ziel.',
  'So far this turn: {count} of {target}.': 'Bisher in dieser Runde: {count} von {target}.',
  'Piggyback!': 'Schweinerei!',
  Sider: 'Sau',
  '+{n}': '+{n}',
  'First throw: 0 points, throw again.': 'Erster Wurf: 0 Punkte, wirf nochmal.',

  // The table
  'In the pen: {n}': 'Im Stall: {n}',
  Scores: 'Punkte',
  'Into the pen: +{n}': 'In den Stall: +{n}',

  'And throw!': 'Und werfen!',
  'That wasn’t a throw. Swing up and let go!': 'Das war kein Wurf. Mit Schwung nach oben und loslassen.',
  'Pick up the pigs and throw them': 'Schweinchen nehmen und werfen',
  'Pick up the pigs, swing up and let go': 'Schweinchen nehmen, nach oben schwingen und loslassen',
  Pen: 'Stall',

  // Finish
  '{n} points': '{n} Punkte',
  'This turn’s points are gone.': 'Die Punkte dieses Zugs sind weg.',
  'The pigs touch: all your points are gone.': 'Die Schweine berühren sich: Alle deine Punkte sind weg.',
  'One on top of the other: all your points are gone.': 'Eins liegt auf dem anderen: Alle deine Punkte sind weg.',
  'The others, by how close they came.': 'Die anderen, nach Punkten.',
  'Both on the same side: 1 point. On different sides (one with the dot up, one without): pig out! This turn’s points are gone. On your turn’s first throw it’s just 0 points: throw again.': 'Beide auf derselben Seite: 1 Punkt. Auf verschiedenen Seiten (eins mit Punkt nach oben, eins ohne): Faule Sau! Die Punkte dieses Zugs sind weg. Beim ersten Wurf deines Zugs zählt das nur 0 Punkte: nochmal werfen.',
  'Both the same is a double and counts four times: back or standing 20, snout 40, snout and ear 60.': 'Beide gleich ist ein Doppel und zählt vierfach: Rücken oder Stehen 20, Schnauze 40, Schnauze und Ohr 60.',
  'The pigs touch (about 1 throw in 100): every point you collected is gone. One lands on top of the other: all your points are gone too.': 'Die Schweine berühren sich (etwa 1 Wurf von 100): Alle gesammelten Punkte sind weg. Liegt eins auf dem anderen: Auch dann sind alle Punkte weg.',
  'First to 100 wins.': 'Wer zuerst 100 hat, gewinnt.',
};

export default schweinerei;
