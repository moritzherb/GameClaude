/*
 * The store app's wording (App Store, Google Play), in place of the website's where that could
 * cost the app: Apple rejects apps that push tobacco or drinking too much (rule 1.4.3), and Google
 * shows fewer ads (and fewer advertisers bid) next to binge drinking, swearing and anything sexual.
 *
 * Keyed by the English text as the code uses it; t() takes these instead when lib/native.ts says
 * this is the store app. The games stay the same games: a shot becomes a sip, downing a drink
 * becomes 3 sips, the names lose their swear words. i18n.test.ts checks that no store text is
 * left with what's banned there.
 */

export const STORE: Record<string, { en: string; de: string }> = {
  /* ---------- First screen: the age check says right away that any drink works ---------- */
  'Party games for pregames, house parties and everything after.': {
    en: 'Party games for adults. Every sip can be water or a soft drink.',
    de: 'Partyspiele für Erwachsene. Jeder Schluck darf auch Wasser oder Softdrink sein.',
  },

  /* ---------- Intensity ---------- */
  Tipsy: { en: 'Lively', de: 'Munter' },

  /* ---------- Asshole (game) / President ranks: Beggar ---------- */
  Asshole: { en: 'Beggar', de: 'Bettler' },
  'Vice Asshole': { en: 'Vice Beggar', de: 'Vize-Bettler' },
  'Sips are counted in the games that know who drinks (President and Asshole, so far).': {
    en: 'Sips are counted in the games that know who drinks (President and Beggar, so far).',
    de: 'Schlucke zählen in den Spielen, die wissen, wer trinkt (bisher Präsident und Bettler).',
  },
  'Whoever ends up with all four Jacks is the Asshole: empty your glass. The game is over.': {
    en: 'Whoever ends up with all four Jacks is the Beggar and drinks 3. The game is over.',
    de: 'Wer alle vier Buben auf der Hand hat, ist der Bettler und trinkt 3. Das Spiel ist aus.',
  },
  'Empty your glass!': { en: 'Drink 3!', de: 'Trink 3!' },
  'All four Jacks. Empty your glass!': { en: 'All four Jacks. Drink 3!', de: 'Alle vier Buben. Trink 3!' },
  'You’re the Asshole!': { en: 'You’re the Beggar!', de: 'Du bist der Bettler!' },
  '{name} is the Asshole!': { en: '{name} is the Beggar!', de: '{name} ist der Bettler!' },
  'Ended up the Asshole': { en: 'Ended up the Beggar', de: 'Bettler geworden' },
  'The first round, whoever holds the 7 of clubs starts. After that the Asshole starts.': {
    en: 'The first round, whoever holds the 7 of clubs starts. After that the Beggar starts.',
    de: 'In der ersten Runde fängt an, wer die Kreuz 7 hat. Danach fängt der Bettler an.',
  },
  'Out of cards: you’re out, the earlier the better. The last one with cards is the Asshole.': {
    en: 'Out of cards: you’re out, the earlier the better. The last one with cards is the Beggar.',
    de: 'Keine Karten mehr: Du bist raus, je früher desto besser. Wer als Letzter noch Karten hat, ist der Bettler.',
  },
  'Ranks: President, Vice President, citizens, Vice Asshole, Asshole. With 3 players there are no vices.': {
    en: 'Ranks: President, Vice President, citizens, Vice Beggar, Beggar. With 3 players there are no vices.',
    de: 'Ränge: Präsident, Vizepräsident, Bürger, Vize-Bettler, Bettler. Zu dritt gibt es keine Vizes.',
  },
  'End of the round: the Asshole drinks 3, the Vice Asshole 2. The President hands out 3, the Vice President 2.': {
    en: 'End of the round: the Beggar drinks 3, the Vice Beggar 2. The President hands out 3, the Vice President 2.',
    de: 'Am Ende der Runde trinkt der Bettler 3, der Vize-Bettler 2. Der Präsident verteilt 3, der Vizepräsident 2.',
  },
  'Next round: the Asshole gives their 2 best cards to the President, the Vice Asshole their best one to the Vice President. They give any cards of their choice back.':
    {
      en: 'Next round: the Beggar gives their 2 best cards to the President, the Vice Beggar their best one to the Vice President. They give any cards of their choice back.',
      de: 'Nächste Runde: Der Bettler gibt seine 2 besten Karten dem Präsidenten, der Vize-Bettler seine beste dem Vizepräsidenten. Die geben beliebige Karten ihrer Wahl zurück.',
    },
  'Each player on their own phone. Get rid of your cards first: the last one is the Asshole.': {
    en: 'Each player on their own phone. Get rid of your cards first: the last one is the Beggar.',
    de: 'Jeder am eigenen Handy. Werd deine Karten als Erster los: Der Letzte ist der Bettler.',
  },

  /* ---------- F*ck the Dealer ---------- */
  'F*ck the Dealer': { en: 'Beat the Dealer', de: 'Schlag den Dealer' },
  '{name} drinks up': { en: '{name} drinks', de: '{name} muss trinken' },

  /* ---------- Pants Down: Thirty-One ---------- */
  'Pants Down': { en: 'Thirty-One', de: 'Einunddreißig' },
  '31 in one suit = Pants down 👖 and three aces = Fire 🔥: the round ends at once.': {
    en: '31 in one suit = Thirty-One 🎯 and three aces = Fire 🔥: the round ends at once.',
    de: '31 in einer Farbe = Einunddreißig 🎯 und drei Asse = Feuer 🔥: Die Runde ist sofort vorbei.',
  },
  '👖 Pants down from You!': { en: '🎯 Thirty-One from you!', de: '🎯 Einunddreißig von dir!' },
  '👖 Pants down from {name}!': { en: '🎯 Thirty-One from {name}!', de: '🎯 Einunddreißig von {name}!' },

  /* ---------- Kings Cup: no cup to mix and down, the Kings are toasts ---------- */
  'An empty cup in the middle': { en: 'Something to drink (water works too)', de: 'Was zu trinken (Wasser geht auch)' },
  'Put an empty cup in the middle: the King’s Cup.': { en: 'Every King is a toast: everyone drinks 1.', de: 'Jeder König ist ein Toast: Alle trinken 1.' },
  'Whoever draws the 4th King drinks the King’s Cup. The game ends when all cards are drawn.': {
    en: 'Whoever draws the 4th King drinks 3. The game ends when all cards are drawn.',
    de: 'Wer den 4. König zieht, trinkt 3. Das Spiel endet, wenn alle Karten gezogen sind.',
  },
  'King’s Cup': { en: 'Toast', de: 'Toast' },
  'Pour some of your drink into the King’s Cup.': { en: 'Raise your glass: everyone drinks 1.', de: 'Glas hoch: Alle trinken 1.' },
  'Drink the King’s Cup!': { en: 'Drink 3!', de: 'Trink 3!' },
  'That was the 4th King. Down the whole cup!': { en: 'That was the 4th King. Drink 3!', de: 'Das war der 4. König. Trink 3!' },
  '{name} drank the King’s Cup': { en: '{name} drew the 4th King', de: '{name} hat den 4. König gezogen' },
  Waterfall: { en: 'Cheers round', de: 'Prost-Runde' },
  'Everyone starts drinking, you first. Nobody may stop before the person before them.': { en: 'Everyone drinks 1, you first.', de: 'Alle trinken 1, du zuerst.' },

  /* ---------- Klatschen: the clap glass is 2, the 4th one 3 ---------- */
  '60 task cards lie face down in a stack, an empty glass next to it. Round the table, everyone slaps the stack in turn: the top card flies off, do what it says.':
    {
      en: '60 task cards lie face down in a stack. Round the table, everyone slaps the stack in turn: the top card flies off, do what it says.',
      de: '60 Aufgabenkarten liegen verdeckt auf einem Stapel. Reihum haut jeder auf den Stapel: Die oberste Karte fliegt raus, und man macht, was draufsteht.',
    },
  'There are 4 clap glass cards. Each one: pour a splash from your glass into the one in the middle.': {
    en: 'There are 4 clap glass cards. Each one: clap 2.',
    de: 'Es gibt 4 Klatschglas-Karten. Bei jeder klatschst du 2.',
  },
  'Whoever draws the 4th clap glass claps the whole glass in the middle, and the game is over.': {
    en: 'Whoever draws the 4th clap glass claps 3, and the game is over.',
    de: 'Wer das 4. Klatschglas zieht, klatscht 3, und das Spiel ist vorbei.',
  },
  'Draw a card each round the table and do what it says. Whoever draws the 4th clap glass claps the glass in the middle, and the game is over.': {
    en: 'Draw a card each round the table and do what it says. Whoever draws the 4th clap glass claps 3, and the game is over.',
    de: 'Reihum zieht jeder eine Karte und macht, was draufsteht. Wer das 4. Klatschglas zieht, klatscht 3, und das Spiel ist vorbei.',
  },
  'You clap the whole glass in the middle. Down in one!': { en: 'You clap 3. The game is over.', de: 'Du klatschst 3. Das Spiel ist vorbei.' },
  '{name} claps the glass!': { en: '{name} claps 3!', de: '{name} klatscht 3!' },
  'All the way down. Cheers!': { en: 'Cheers!', de: 'Prost!' },
  'Pour a splash from your glass into the one in the middle. Whoever draws the 4th one claps the whole glass.': {
    en: 'Clap 2. Whoever draws the 4th one claps 3 and ends the game.',
    de: 'Klatsch 2. Wer das 4. zieht, klatscht 3 und beendet das Spiel.',
  },
  'Everyone starts clapping, you first. Nobody may stop before the person on their right has stopped.': {
    en: 'Everyone claps 1, you first.',
    de: 'Alle klatschen 1, du zuerst.',
  },

  /* ---------- Party: sips, not shots; no downing, no mixing, no smacking ---------- */
  Shots: { en: 'Something to drink', de: 'Was zu trinken' },
  Shot: { en: 'Sip', de: 'Schluck' },
  '{n} shots': { en: '{n} sips', de: '{n} Schlucke' },
  '1 shot': { en: '1 sip', de: '1 Schluck' },
  'Take a shot': { en: 'Take a sip', de: 'Trink einen Schluck' },
  'Take {n} shots': { en: 'Drink {n} sips', de: 'Trink {n} Schlucke' },
  'Down a shot.': { en: 'Take a sip.', de: 'Trink einen Schluck.' },
  'Down {n} shots, one after the other.': { en: 'Drink {n} sips.', de: 'Trink {n} Schlucke.' },
  Ex: { en: 'Big sip', de: 'Großer Schluck' },
  'Ex!': { en: 'Big sip!', de: 'Großer Schluck!' },
  'Down your drink in one.': { en: 'Drink 3 sips.', de: 'Trink 3 Schlucke.' },
  'Everyone starts drinking, you first. Nobody may stop before the one before them stops.': { en: 'Everyone drinks 1, you first.', de: 'Alle trinken 1, du zuerst.' },
  'Mystery shot': { en: 'Mystery dare', de: 'Mystery-Aufgabe' },
  'The others mix you a mystery shot. Down it.': {
    en: 'The others give you a harmless dare. Do it, or drink 2.',
    de: 'Die anderen geben dir eine harmlose Aufgabe. Mach sie oder trink 2.',
  },
  'Drink 1, or roll: a 5 or 6 passes double to the next player (2, then 4, 8 …), who takes it or rolls on. Miss the roll and you drink it all.': {
    en: 'Drink 1, or roll: a 5 or 6 passes it on doubled to the next player (2, then 4 at most), who takes it or rolls on. Miss the roll and you drink it.',
    de: 'Trink 1 oder würfle: Mit 5 oder 6 geht es verdoppelt an den Nächsten (2, dann höchstens 4), der trinkt oder weiterwürfelt. Wer es nicht schafft, trinkt es.',
  },
  Cheek: { en: 'High five', de: 'High Five' },
  'Give the player on your right ({name}) a smack on the bum. Only if they say yes!': {
    en: 'High-five the player on your right ({name}). Miss it, and you both drink 1.',
    de: 'Gib deinem rechten Nachbarn ({name}) ein High Five. Daneben: Ihr trinkt beide 1.',
  },
  'Give the player on your right a smack on the bum. Only if they say yes!': {
    en: 'High-five the player on your right. Miss it, and you both drink 1.',
    de: 'Gib deinem rechten Nachbarn ein High Five. Daneben: Ihr trinkt beide 1.',
  },

  'Shot with no hands': { en: 'Sip with no hands', de: 'Schluck ohne Hände' },
  'Down a shot without using your hands: hold the glass in your teeth.': {
    en: 'Take a sip without using your hands.',
    de: 'Trink einen Schluck, ohne die Hände zu benutzen.',
  },
  '{n}-second chug': { en: '{n}-second sip', de: '{n}-Sekunden-Schluck' },
  'Drink without stopping for {n} seconds. The others count.': {
    en: 'Sip slowly while the others count to {n}.',
    de: 'Trink langsam, während die anderen bis {n} zählen.',
  },
  Smokers: { en: 'Coffee', de: 'Kaffee' },
  'Smokers drink': { en: 'Coffee drinkers', de: 'Kaffeetrinker' },
  'Everyone who smokes drinks 2.': { en: 'Everyone who had a coffee today drinks 2.', de: 'Alle, die heute schon Kaffee hatten, trinken 2.' },

  /* ---------- Party: no tobacco (App Store rule 1.4.3): the same games with a box and a tin ---------- */
  'Tschick flip': { en: 'Box flip', de: 'Schachtel-Flip' },
  'Everyone flips the pack in turn, you first. Flat: 1 sip, on its side: 2, upright: 3. Each throw must be as good or better than the one before. The sips add up: whoever can’t keep up drinks them all.':
    {
      en: 'Everyone flips the box in turn, you first. Flat: 1 sip, on its side: 2, upright: 3. Each throw must be as good or better than the one before. Whoever can’t keep up drinks 3.',
      de: 'Alle werfen reihum die Schachtel, du zuerst. Liegt sie flach: 1 Schluck, auf der Seite: 2, aufrecht: 3. Jeder Wurf muss gleich gut oder besser sein als der davor. Wer es nicht schafft, trinkt 3.',
    },
  'Snus flip': { en: 'Tin flip', de: 'Dosen-Wurf' },

  /* ---------- Bus Driver: no doubling pyramid ---------- */
  'Tipsy ×2': { en: 'Double ×2', de: 'Doppelt ×2' },
  'Hold the same value as the flipped card? Lay it down and give out that row’s sips: 1-2-3-4-5, Tipsy ×2 (1-2-4-8-16) or Tipsy +2 (2-4-6-8-10). Two matching cards = give out twice.':
    {
      en: 'Hold the same value as the flipped card? Lay it down and give out that row’s sips: 1-2-3-4-5, or Bonus +2 (2-4-6-8-10). Two matching cards = give out twice.',
      de: 'Du hast den Wert der aufgedeckten Karte? Leg deine Karte drauf und verteil die Schlucke der Reihe: 1-2-3-4-5 oder Bonus +2 (2-4-6-8-10). Zwei passende Karten = doppelt verteilen.',
    },
  'Tipsy +2': { en: 'Bonus +2', de: 'Bonus +2' },

  /* ---------- Schweinerei, Who drinks?, Horse race ---------- */
  'The pigs touch (about 1 throw in 100): every point you collected is gone, drink 2. One lands on top of the other: all your points are gone, drink up.': {
    en: 'The pigs touch (about 1 throw in 100): every point you collected is gone, drink 2. One lands on top of the other: all your points are gone, drink 3.',
    de: 'Berühren sich die Schweine (Sauhaufen, etwa jeder 100. Wurf): alle deine gesammelten Punkte sind weg, trink 2. Liegt eins auf dem anderen (Schweinerei): alle Punkte weg, trink 3.',
  },
  'One on top of the other: all your points are gone. Drink up!': {
    en: 'One on top of the other: all your points are gone. Drink 3!',
    de: 'Eins auf dem anderen: alle deine Punkte sind weg. Trink 3!',
  },
  'Finish your drink!': { en: 'Drink 3!', de: 'Trink 3!' },
  'Waterfall – you start!': { en: 'Cheers round – you start, everyone drinks 1!', de: 'Prost-Runde – du fängst an, alle trinken 1!' },
  'Drink up': { en: 'Drink', de: 'Trinken' },
};

/** Game emojis that don't go in the store app (swearing, toilet humour, pants). */
export const STORE_EMOJI: Record<string, string> = {
  '🤬': '🎴',
  '💩': '🃏',
  '👖': '🎯',
};
