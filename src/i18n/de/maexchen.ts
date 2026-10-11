// German translations for this game. Keys are the exact English text.
const maexchen: Record<string, string> = {
  // Game info (index.ts)
  Mäxchen: 'Mäxchen',
  'Two dice, one cup, a lot of lying.': 'Zwei Würfel, ein Becher, viel gelogen.',
  'Two dice under a cup on a beer mat. The phone is the cup: it goes round to the left.':
    'Zwei Würfel unter einem Becher auf einem Bierdeckel. Das Handy ist der Becher: Er geht reihum nach links.',
  'The higher die counts first: 6 and 3 is 63. From low to high: 31, 32, 41 … 65, then the doubles 11 … 66, and the Mäxchen (2 and 1) beats everything.':
    'Der höhere Würfel zählt zuerst: 6 und 3 ist 63. Von klein nach groß: 31, 32, 41 … 65, dann die Päsche 11 … 66, und das Mäxchen (2 und 1) schlägt alles.',
  'Shake, look under the cup (or don’t) and announce a value. It has to beat the one before, and it may be a lie.':
    'Schütteln, unter den Becher schauen (oder nicht) und einen Wert ansagen. Er muss den vorigen schlagen und darf gelogen sein.',
  'Once you’ve looked, you may shake one more time, blind: then no more looking, you have to announce something anyway.':
    'Hast du reingeschaut, darfst du noch einmal schütteln, blind: Dann darfst du nicht mehr reinschauen und musst trotzdem etwas ansagen.',
  'The next player believes it and shakes again (and has to announce even higher), or lifts the cup.':
    'Der Nächste glaubt es und schüttelt neu (und muss noch höher ansagen), oder er hebt den Becher.',
  'Lifted: if the dice show at least what was announced, the one who lifted drinks. If not, the liar drinks.':
    'Aufgedeckt: Zeigen die Würfel mindestens das Angesagte, trinkt der, der aufgedeckt hat. Sonst trinkt der Lügner.',
  'A Mäxchen can’t be beaten, so the next player has to lift the cup. Whoever is wrong drinks 2.':
    'Ein Mäxchen kann man nicht schlagen, also muss der Nächste aufdecken. Wer falsch liegt, trinkt 2.',
  'Whoever drank starts the next round.': 'Wer getrunken hat, beginnt die nächste Runde.',

  // Setup
  'Then the cup goes round to the left. Lie well, doubt better.': 'Dann geht der Becher reihum nach links. Gut lügen, besser zweifeln.',

  // The table
  'Believed it: now beat {value}': 'Geglaubt: jetzt {value} toppen',
  'Shaken blind: no more looking, announce something': 'Blind geschüttelt: nicht mehr reinschauen, sag was an',
  'Announce, or shake once more blind': 'Ansagen, oder nochmal blind schütteln',
  'believe it or lift the cup?': 'glauben oder aufdecken?',
  'Mäxchen: you have to lift the cup': 'Mäxchen: du musst aufdecken',
  'drinks 1 sip': 'trinkt 1 Schluck',
  'drinks {n} sips': 'trinkt {n} Schlucke',
  'Tap the cup to shake': 'Becher antippen zum Schütteln',
  'Hold the cup to look under it': 'Becher gedrückt halten zum Reinschauen',
  'Hand the phone to {name}': 'Gib das Handy an {name}',
  '{name} says': '{name} sagt',
  'To beat': 'Zu toppen',
  'New round': 'Neue Runde',
  Anything: 'Alles offen',
  'Shake the cup': 'Becher schütteln',
  'Hold to look under the cup': 'Gedrückt halten, um unter den Becher zu schauen',
  'Dice cup': 'Würfelbecher',
  'It’s true!': 'Stimmt!',
  'Lie!': 'Gelogen!',
  '{actual} under the cup, {claim} announced': 'Unterm Becher: {actual}. Angesagt: {claim}.',
  'Mäxchen! Nothing beats it: lift the cup.': 'Mäxchen! Höher geht nicht: aufdecken.',
  Shake: 'Schütteln',
  'Announce…': 'Ansagen …',
  'Shaken blind 🙈': 'Blind geschüttelt 🙈',
  'Shake once more, blind': 'Nochmal blind schütteln',
  'Lift the cup!': 'Aufdecken!',
  'Believe it and shake': 'Glauben und schütteln',
  'New round: {name} starts': 'Neue Runde: {name} beginnt',
  'What do you announce?': 'Was sagst du an?',
  Double: 'Pasch',
  'Double {n}s': '{n}er-Pasch',
  'Low to high: 31 … 65, then the doubles, then the Mäxchen (21).': 'Von klein nach groß: 31 … 65, dann die Päsche, dann das Mäxchen (21).',
  'Pick a value': 'Wert wählen',
  'Announce {value}': '{value} ansagen',
};

export default maexchen;
