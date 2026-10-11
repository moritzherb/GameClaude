import { tx } from '../../i18n';

/**
 * Klatschen's deck: 60 task cards in a circle round a glass. In this game nobody says "drink":
 * you say "clap" ("klatschen") instead, and the cards do too.
 */
export interface TaskCard {
  id: string;
  emoji: string;
  /** English; translate with t() when rendering. */
  title: string;
  /** English; translate with t() when rendering. */
  text: string;
  /** Card colour, one of the flat colour tokens. */
  color: string;
  /** How many of it are in the deck. */
  count: number;
  /** Who drew it holds a role until the next card of the same kind. */
  role?: 'questions' | 'thumb';
}

export const GLASS_ID = 'glass';

export const CARDS: TaskCard[] = [
  { id: GLASS_ID, emoji: '🍺', title: tx('Clap glass'), text: tx('Pour a splash from your glass into the one in the middle. Whoever draws the 4th one claps the whole glass.'), color: 'var(--c-yellow)', count: 4 },
  { id: 'slap', emoji: '🖐️', title: tx('Slap the table'), text: tx('Everyone slaps the table. The last one claps 2.'), color: 'var(--c-orange)', count: 3 },
  { id: 'waterfall', emoji: '🌊', title: tx('Waterfall'), text: tx('Everyone starts clapping, you first. Nobody may stop before the person on their right has stopped.'), color: 'var(--c-blue)', count: 2 },
  { id: 'you', emoji: '👉', title: tx('You'), text: tx('Pick someone who claps 2.'), color: 'var(--c-pink)', count: 3 },
  { id: 'me', emoji: '🙋', title: tx('Me'), text: tx('You clap 2.'), color: 'var(--c-red)', count: 2 },
  { id: 'cheers', emoji: '🥂', title: tx('Cheers!'), text: tx('Everyone claps 1.'), color: 'var(--c-mint)', count: 2 },
  { id: 'rhyme', emoji: '🎤', title: tx('Rhyme'), text: tx('Say a word. Go round rhyming on it. The first one who can’t claps 2.'), color: 'var(--c-lilac)', count: 2 },
  { id: 'category', emoji: '📋', title: tx('Category'), text: tx('Pick a category (beers, car brands…). Go round naming things. Whoever can’t or repeats one claps 2.'), color: 'var(--c-teal)', count: 3 },
  { id: 'rule', emoji: '📜', title: tx('New rule'), text: tx('Make up a rule. It lasts until the next rule card. Whoever breaks it claps 1.'), color: 'var(--c-indigo)', count: 2 },
  { id: 'questions', emoji: '❓', title: tx('Question Master'), text: tx('Until the next Question Master: whoever answers one of your questions claps 1.'), color: 'var(--c-lilac)', count: 2, role: 'questions' },
  { id: 'thumb', emoji: '👍', title: tx('Thumb Master'), text: tx('Some time later, quietly put your thumb on the table. The last one to copy you claps 2. Until the next Thumb Master.'), color: 'var(--c-orange)', count: 2, role: 'thumb' },
  { id: 'mate', emoji: '🤝', title: tx('Buddy'), text: tx('Pick a buddy: every time you clap, they clap too. Until the next buddy card.'), color: 'var(--c-pink)', count: 2 },
  { id: 'heaven', emoji: '🙌', title: tx('Heaven'), text: tx('Both hands up! The last one claps 2.'), color: 'var(--c-blue)', count: 2 },
  { id: 'nose', emoji: '👃', title: tx('Nose'), text: tx('Everyone touches their nose. The last one claps 2.'), color: 'var(--c-yellow)', count: 2 },
  { id: 'rps', emoji: '✂️', title: tx('Rock, paper, scissors'), text: tx('Against the player on your left. The loser claps 2.'), color: 'var(--c-mint)', count: 2 },
  { id: 'never', emoji: '🙈', title: tx('Never have I ever'), text: tx('Say something you’ve never done. Everyone who has claps 1.'), color: 'var(--c-red)', count: 2 },
  { id: 'likely', emoji: '👆', title: tx('Most likely'), text: tx('Ask a “Who would most likely…” question. On three everyone points. Whoever gets the most fingers claps 2.'), color: 'var(--c-teal)', count: 2 },
  { id: 'count', emoji: '🔢', title: tx('Seven'), text: tx('Count round the table. Instead of any number with a 7 in it or that 7 goes into, clap your hands. Whoever slips claps 2.'), color: 'var(--c-indigo)', count: 2 },
  { id: 'story', emoji: '📖', title: tx('Story'), text: tx('Tell a story together, one word each round the table. Whoever hesitates claps 2.'), color: 'var(--c-orange)', count: 2 },
  { id: 'accent', emoji: '🗣️', title: tx('Accent'), text: tx('Talk with an accent until your next turn. Every time you forget, clap 1.'), color: 'var(--c-pink)', count: 2 },
  { id: 'silence', emoji: '🤐', title: tx('Silence'), text: tx('Nobody says a word until the next card is drawn. Whoever talks claps 1.'), color: 'var(--c-blue)', count: 2 },
  { id: 'birthday', emoji: '🎂', title: tx('Birthday'), text: tx('Whoever has the next birthday claps 2.'), color: 'var(--c-yellow)', count: 1 },
  { id: 'youngest', emoji: '👶', title: tx('Youngest'), text: tx('The youngest at the table claps 2.'), color: 'var(--c-mint)', count: 1 },
  { id: 'oldest', emoji: '🧓', title: tx('Oldest'), text: tx('The oldest at the table claps 2.'), color: 'var(--c-lilac)', count: 1 },
  { id: 'compliment', emoji: '💬', title: tx('Compliment'), text: tx('Pay someone an honest compliment. If nobody buys it, you clap 2.'), color: 'var(--c-red)', count: 2 },
  { id: 'give', emoji: '🎯', title: tx('Hand out'), text: tx('Hand out 3 claps however you like.'), color: 'var(--c-teal)', count: 3 },
  { id: 'swap', emoji: '🔁', title: tx('Swap seats'), text: tx('Swap seats with someone of your choice.'), color: 'var(--c-indigo)', count: 1 },
  { id: 'truth', emoji: '😶', title: tx('Truth'), text: tx('The player on your right asks you a question. Answer honestly or clap 3.'), color: 'var(--c-orange)', count: 2 },
  { id: 'stare', emoji: '👀', title: tx('Staring contest'), text: tx('Against someone of your choice. Whoever blinks or laughs first claps 2.'), color: 'var(--c-blue)', count: 1 },
  { id: 'tongue', emoji: '👅', title: tx('Tongue twister'), text: tx('Say “Fischers Fritz fischt frische Fische” three times fast. Get it wrong: clap 2.'), color: 'var(--c-pink)', count: 1 },
];

/** The house rules that hold all game long. Breaking one: clap 1. */
export const STANDING_RULES = [
  { emoji: '🚫', text: tx('Never say “drink”. Say “clap” instead.') },
  { emoji: '🫲', text: tx('Only hold your glass in your left hand.') },
  { emoji: '🤬', text: tx('No swearing.') },
];

export const byId = (id: string) => CARDS.find((c) => c.id === id)!;

/** The whole deck, one entry per card. */
export const DECK: string[] = CARDS.flatMap((c) => Array<string>(c.count).fill(c.id));
