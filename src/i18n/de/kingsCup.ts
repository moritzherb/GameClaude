// German translations for this game. Keys are the exact English text.
const kingsCup: Record<string, string> = {
  // Game info (index.ts)
  'Kings Cup': 'Kings Cup',
  'Every card is a rule. Don’t draw the last King.': 'Jede Karte eine Regel. Zieh bloß nicht den letzten König.',
  'An empty cup in the middle': 'Ein leerer Becher in der Mitte',
  'Put an empty cup in the middle: the King’s Cup.': 'Stellt einen leeren Becher in die Mitte: den King’s Cup.',
  'Take turns drawing a card. Each card has a rule:': 'Zieht reihum eine Karte. Jede Karte hat eine Regel:',
  'Whoever draws the 4th King drinks the King’s Cup. The game ends when all cards are drawn.':
    'Wer den 4. König zieht, trinkt den King’s Cup. Das Spiel endet, wenn alle Karten gezogen sind.',

  // Card rules (rules.ts)
  Waterfall: 'Wasserfall',
  'Everyone starts drinking, you first. Nobody may stop before the person before them.':
    'Alle trinken los, du zuerst. Keiner darf aufhören, bevor sein Vordermann aufhört.',
  You: 'Du',
  'Pick someone to drink.': 'Such dir jemanden aus, der trinkt.',
  Me: 'Ich',
  'You drink.': 'Du trinkst.',
  Floor: 'Boden',
  'Everyone touches the floor. Last one drinks.': 'Alle fassen den Boden an. Der Letzte trinkt.',
  Guys: 'Jungs',
  'All guys drink.': 'Alle Jungs trinken.',
  Girls: 'Mädels',
  'All girls drink.': 'Alle Mädels trinken.',
  Heaven: 'Himmel',
  'Everyone puts both hands up to the sky. Last one drinks.': 'Alle strecken beide Hände in den Himmel. Der Letzte trinkt.',
  Mate: 'Trinkpartner',
  'Pick a mate. Every time you drink, they drink too. Until the next 8.':
    'Such dir einen Trinkpartner. Immer wenn du trinkst, trinkt dein Partner mit. Bis zur nächsten 8.',
  Rhyme: 'Reim',
  'Say a word. Go around rhyming on it. First one who can’t drinks.':
    'Sag ein Wort. Reihum wird darauf gereimt. Wem zuerst nichts mehr einfällt, der trinkt.',
  Categories: 'Kategorien',
  'Pick a category (car brands, beers…). Go around naming things. First one who can’t drinks.':
    'Wähl eine Kategorie (Automarken, Biersorten …). Reihum zählt ihr was auf. Wem zuerst nichts mehr einfällt, der trinkt.',
  'Make a rule': 'Regel',
  'Invent a rule. It lasts until the next Jack. Anyone who breaks it drinks.':
    'Denk dir eine Regel aus. Sie gilt bis zum nächsten Buben. Wer sie bricht, trinkt.',
  'Question Master': 'Fragenmeister',
  'Anyone who answers one of your questions drinks. Lasts until the next Queen.':
    'Wer eine deiner Fragen beantwortet, trinkt. Gilt bis zur nächsten Dame.',
  'King’s Cup': 'King’s Cup',
  'Pour some of your drink into the King’s Cup.': 'Kipp einen Schluck von deinem Drink in den King’s Cup.',
  'Drink the King’s Cup!': 'Ex den King’s Cup!',
  'That was the 4th King. Down the whole cup!': 'Das war der 4. König. Trink den ganzen Becher leer!',

  // Game screen (KingsCup.tsx)
  hearts: 'Herz',
  diamonds: 'Karo',
  spades: 'Pik',
  clubs: 'Kreuz',
  'Game over': 'Spiel vorbei',
  '{name} drank the King’s Cup': '{name} hat den King’s Cup geext',
  'Deck’s empty!': 'Stapel leer!',
  '{n} cards drawn.': '{n} Karten gezogen.',
  'Play again': 'Nochmal spielen',
  'Back to games': 'Zurück zu den Spielen',
  'drew a card': 'hat gezogen',
  'your turn': 'du bist dran',
  'Face-down card': 'Verdeckte Karte',
  'Pick any card': 'Zieh irgendeine Karte',
  'Who’s your mate?': 'Wer ist dein Trinkpartner?',
  'Write down your rule (optional)': 'Schreib deine Regel auf (optional)',
  'e.g. No first names': 'z. B. Keine Vornamen',
  'Save rule': 'Regel speichern',
  'Finish game': 'Spiel beenden',
  'Next: {name} →': 'Weiter: {name} →',
  '{title}: {text} Tap to see the card.': '{title}: {text} Tippen für die Karte.',
  '{rank} of {suit}. Tap for the rule.': '{suit} {rank}. Tippen für die Regel.',
  'Tap for the card': 'Tippen für die Karte',
  'Tap for the rule': 'Tippen für die Regel',
  '{n} of 4 Kings drawn': '{n} von 4 Königen gezogen',
  'In play': 'Im Spiel',
  '{name} is Question Master': '{name} ist Fragenmeister',
  '{a} is mates with {b}': '{a} ist Trinkpartner von {b}',
};

export default kingsCup;
