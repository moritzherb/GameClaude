import { t, tx } from '../../i18n';

/** Every kind of field on a Party board. */
export type FieldKind =
  | 'start'
  | 'goal'
  | 'shots'
  | 'ex'
  | 'rule'
  | 'give'
  | 'ace'
  | 'rps'
  | 'clock'
  | 'waterfall'
  | 'age'
  | 'tschick'
  | 'bridge'
  | 'mystery'
  | 'seats'
  | 'twins'
  | 'leader'
  | 'snus'
  | 'chance'
  | 'reverse'
  | 'double'
  | 'back-bridge'
  | 'choose'
  | 'three-six-nine'
  | 'cheek'
  | 'toilet'
  | 'snail'
  | 'duel'
  | 'silence'
  | 'shop'
  | 'prison'
  | 'roll-back'
  | 'roll-again'
  | 'safe'
  | 'girls'
  | 'boys'
  | 'swap-drink'
  | 'mole'
  | 'mate'
  | 'hands';

/**
 * One field on the board. `n` is the field's setting where it has one: how many shots or sips,
 * even (0) or odd (1) for the clock and age, 5–6 (0) or 1–2 (1) for a bridge, how far back.
 */
export interface Field {
  kind: FieldKind;
  n?: number;
}

/** What a field's setting can be, for the board editor. */
export interface FieldParam {
  values: number[];
  def: number;
  /** How a value reads (already translated). */
  label: (n: number) => string;
}

export type FieldGroup = 'drink' | 'give' | 'game' | 'everyone' | 'move';

export interface FieldInfo {
  emoji: string;
  /** The field's colour on the board. */
  color: string;
  group: FieldGroup;
  /** On the field itself: a word or two (translated). */
  label: (n: number) => string;
  /** On the card when someone lands there (translated). */
  title: (n: number) => string;
  /**
   * What to do (translated). `n`: the field's setting; for a bridge back or tunnel, the field it
   * leads to (-1: not known). `right`: the name of the player on the lander's right (if known).
   */
  text: (n: number, right: string) => string;
  /** An Ace up the sleeve skips it. */
  ace?: boolean;
  /** "Choose one" can pick it: no advantage and no moving. */
  choose?: boolean;
  param?: FieldParam;
}

const C = {
  yellow: '#ffd23f',
  orange: '#ff8a3d',
  pink: '#ff7eb6',
  blue: '#6cb6ff',
  mint: '#4be3a5',
  lilac: '#c3a6ff',
  red: '#ff5a4e',
  indigo: '#8f8cff',
  teal: '#36d1c4',
  lime: '#c5f235',
  cream: '#f3efe4',
  wood: '#c8935a',
  grey: '#bdb9ad',
  gold: '#f2c94c',
  brown: '#a9744f',
};

const evenOdd: FieldParam = { values: [0, 1], def: 0, label: (n) => (n ? t('Odd') : t('Even')) };

export const FIELDS: Record<FieldKind, FieldInfo> = {
  start: {
    emoji: '🏁',
    color: C.lime,
    group: 'move',
    label: () => t('Start'),
    title: () => t('Start'),
    text: () => t('Everyone starts here.'),
  },
  goal: {
    emoji: '🏆',
    color: C.gold,
    group: 'move',
    label: () => t('Finish'),
    title: () => t('Finish!'),
    text: () => t('Only an exact roll gets you in. Too many, and you walk the rest back.'),
  },
  shots: {
    emoji: '🥃',
    color: C.yellow,
    group: 'drink',
    label: (n) => (n === 1 ? t('Shot') : t('{n} shots', { n })),
    title: (n) => (n === 1 ? t('Take a shot') : t('Take {n} shots', { n })),
    text: (n) => (n === 1 ? t('Down a shot.') : t('Down {n} shots, one after the other.', { n })),
    ace: true,
    choose: true,
    param: { values: [1, 2, 3, 4, 5], def: 1, label: (n) => (n === 1 ? t('1 shot') : t('{n} shots', { n })) },
  },
  ex: {
    emoji: '🍺',
    color: C.red,
    group: 'drink',
    label: () => t('Ex'),
    title: () => t('Ex!'),
    text: () => t('Down your drink in one.'),
    ace: true,
    choose: true,
  },
  rule: {
    emoji: '📜',
    color: C.lilac,
    group: 'give',
    label: () => t('Rule'),
    title: () => t('Make a rule'),
    text: () => t('Set a rule for the rest of the game. Whoever breaks it drinks.'),
  },
  give: {
    emoji: '🎁',
    color: C.mint,
    group: 'give',
    label: (n) => t('{n} sips to …', { n }),
    title: (n) => t('Give out {n} sips', { n }),
    text: (n) => t('Hand out {n} sips: all to one player, or spread them around.', { n }),
    param: { values: [2, 3, 5, 10], def: 2, label: (n) => t('{n} sips', { n }) },
  },
  ace: {
    emoji: '🂡',
    color: C.cream,
    group: 'give',
    label: () => t('Ace up the sleeve'),
    title: () => t('Ace up your sleeve'),
    text: () => t('Keep it for later: on a field you don’t want to do, play the Ace and skip it. Once.'),
  },
  rps: {
    emoji: '✂️',
    color: C.blue,
    group: 'game',
    label: () => t('Rock paper scissors'),
    title: () => t('Rock, paper, scissors'),
    text: () => t('Play it against anyone you like. The loser drinks 2.'),
    ace: true,
    choose: true,
  },
  clock: {
    emoji: '🕒',
    color: C.orange,
    group: 'drink',
    label: (n) => (n ? t('Odd time') : t('Even time')),
    title: (n) => (n ? t('Odd time') : t('Even time')),
    text: (n) => (n ? t('An odd number of minutes on the clock right now: drink 2.') : t('An even number of minutes on the clock right now: drink 2.')),
    ace: true,
    choose: true,
    param: evenOdd,
  },
  waterfall: {
    emoji: '🌊',
    color: C.teal,
    group: 'everyone',
    label: () => t('Waterfall'),
    title: () => t('Waterfall'),
    text: () => t('Everyone starts drinking, you first. Nobody may stop before the one before them stops.'),
    choose: true,
  },
  age: {
    emoji: '🎂',
    color: C.pink,
    group: 'drink',
    label: (n) => (n ? t('Odd age') : t('Even age')),
    title: (n) => (n ? t('Odd age') : t('Even age')),
    text: (n) => (n ? t('Is your age an odd number? Then drink 2.') : t('Is your age an even number? Then drink 2.')),
    ace: true,
    choose: true,
    param: evenOdd,
  },
  tschick: {
    emoji: '🚬',
    color: C.red,
    group: 'game',
    label: () => t('Tschick flip'),
    title: () => t('Tschick flip'),
    text: () =>
      t('Everyone flips the pack in turn, you first. Flat: 1 sip, on its side: 2, upright: 3. Each throw must be as good or better than the one before. The sips add up: whoever can’t keep up drinks them all.'),
    choose: true,
  },
  bridge: {
    emoji: '🌉',
    color: C.wood,
    group: 'move',
    label: (n) => (n ? t('Bridge 1–2') : t('Bridge 5–6')),
    title: () => t('Bridge'),
    text: (n) =>
      n
        ? t('To cross, roll a 1 or a 2: then over you go, and roll again. If not, drink 1 and wait here for your next turn.')
        : t('To cross, roll a 5 or a 6: then over you go, and roll again. If not, drink 1 and wait here for your next turn.'),
    ace: true,
    param: { values: [0, 1], def: 0, label: (n) => (n ? t('Roll 1 or 2') : t('Roll 5 or 6')) },
  },
  mystery: {
    emoji: '🧪',
    color: C.indigo,
    group: 'drink',
    label: () => t('Mystery shot'),
    title: () => t('Mystery shot'),
    text: () => t('The others mix you a mystery shot. Down it.'),
    ace: true,
    choose: true,
  },
  seats: {
    emoji: '💺',
    color: C.blue,
    group: 'everyone',
    label: () => t('Swap seats'),
    title: () => t('Swap seats'),
    text: (_n, right) =>
      right
        ? t('Swap seats with the player on your right ({name}). The order of play changes with you.', { name: right })
        : t('Swap seats with the player on your right. The order of play changes with you.'),
    choose: true,
  },
  twins: {
    emoji: '👯',
    color: C.pink,
    group: 'game',
    label: () => t('Twins'),
    title: () => t('Twins'),
    text: () => t('Pick a player and both roll. The same number: you give out 10 sips together. If not, you both drink 1.'),
    choose: true,
  },
  leader: {
    emoji: '🥇',
    color: C.yellow,
    group: 'everyone',
    label: () => t('1st drinks'),
    title: () => t('First place drinks'),
    text: () => t('Whoever is furthest along drinks 2. Several in front: all of them.'),
    choose: true,
  },
  snus: {
    emoji: '⭐',
    color: C.cream,
    group: 'game',
    label: () => t('Snus flip'),
    title: () => t('Snus flip'),
    text: () => t('Call it, lid or bottom, then flip the tin like a coin. Right: give out 2. Wrong: drink 2.'),
    ace: true,
    choose: true,
  },
  chance: {
    emoji: '🎯',
    color: C.orange,
    group: 'game',
    label: () => t('Probability'),
    title: () => t('Probability'),
    text: () => t('Pick a player. Count down 3, 2, 1, then both say a number from 1 to 5 at once. The same: you each give out 2. Not: you both drink 2.'),
    choose: true,
  },
  reverse: {
    emoji: '🔁',
    color: C.lime,
    group: 'everyone',
    label: () => t('Reverse'),
    title: () => t('Reverse'),
    text: () => t('The order of play turns round.'),
    choose: true,
  },
  double: {
    emoji: '✖️',
    color: C.red,
    group: 'game',
    label: () => t('Take or double'),
    title: () => t('Take or double'),
    text: () => t('Drink 1, or roll: a 5 or 6 passes double to the next player (2, then 4, 8 …), who takes it or rolls on. Miss the roll and you drink it all.'),
    choose: true,
  },
  'back-bridge': {
    emoji: '🌉',
    color: C.wood,
    group: 'move',
    label: () => t('Bridge back'),
    title: () => t('Bridge back'),
    text: (n) => (n >= 0 ? t('Over the bridge you go, back to field {n}.', { n }) : t('Over the bridge you go, back to the field across the water.')),
    ace: true,
  },
  choose: {
    emoji: '🍀',
    color: C.mint,
    group: 'game',
    label: () => t('Choose one'),
    title: () => t('Choose one'),
    text: () => t('Pick a field from the board and do what it says. You stay where you are.'),
  },
  'three-six-nine': {
    emoji: '👏',
    color: C.yellow,
    group: 'game',
    label: () => t('3-6-9'),
    title: () => t('3-6-9'),
    text: () => t('Count up in turn from 1, you start. For every 3, 6 or 9 in a number, clap instead of saying it (33: clap twice). Whoever gets it wrong drinks 2.'),
    choose: true,
  },
  cheek: {
    emoji: '🍑',
    color: C.pink,
    group: 'game',
    label: () => t('Cheek'),
    title: () => t('Cheek'),
    text: (_n, right) =>
      right
        ? t('Give the player on your right ({name}) a smack on the bum. Only if they say yes!', { name: right })
        : t('Give the player on your right a smack on the bum. Only if they say yes!'),
    ace: true,
    choose: true,
  },
  toilet: {
    emoji: '🚽',
    color: C.cream,
    group: 'everyone',
    label: () => t('Toilet'),
    title: () => t('Toilet'),
    text: () => t('Whoever was on the loo last drinks 2.'),
    choose: true,
  },
  snail: {
    emoji: '🐌',
    color: C.orange,
    group: 'everyone',
    label: () => t('Snail'),
    title: () => t('Snail'),
    text: () => t('Whoever is furthest behind drinks 2. Several at the back: all of them.'),
    choose: true,
  },
  duel: {
    emoji: '⚔️',
    color: C.lilac,
    group: 'game',
    label: () => t('Dice duel'),
    title: () => t('Dice duel'),
    text: () => t('Pick a player and both roll. The lower number drinks both numbers added up. The same: roll again.'),
    choose: true,
  },
  silence: {
    emoji: '🤫',
    color: C.grey,
    group: 'everyone',
    label: () => t('Silence'),
    title: () => t('Silence'),
    text: () => t('Nobody says a word until it’s your turn again. Whoever talks drinks 1.'),
    choose: true,
  },
  shop: {
    emoji: '🛒',
    color: C.teal,
    group: 'give',
    label: () => t('Shopping'),
    title: () => t('Shopping'),
    text: () => t('Buy sips: drink as many as you like, then give out exactly as many.'),
    choose: true,
  },
  prison: {
    emoji: '⛓️',
    color: C.grey,
    group: 'move',
    label: () => t('Prison'),
    title: () => t('Prison'),
    text: () => t('Locked up. Only a 6 gets you out: roll for it on each of your turns.'),
    ace: true,
  },
  'roll-back': {
    emoji: '⏪',
    color: C.indigo,
    group: 'move',
    label: () => t('Roll back'),
    title: () => t('Roll back'),
    text: () => t('Roll again, and go that many fields back.'),
    ace: true,
  },
  'roll-again': {
    emoji: '🎲',
    color: C.lime,
    group: 'move',
    label: () => t('Roll again'),
    title: () => t('Roll again'),
    text: () => t('Lucky you: roll again.'),
  },
  safe: {
    emoji: '🛡️',
    color: C.mint,
    group: 'move',
    label: () => t('Safe'),
    title: () => t('Safe'),
    text: () => t('Nothing happens here. Relax.'),
  },
  girls: {
    emoji: '👩',
    color: C.pink,
    group: 'everyone',
    label: () => t('Girls'),
    title: () => t('Girls drink'),
    text: () => t('All the girls drink 2.'),
    choose: true,
  },
  boys: {
    emoji: '👨',
    color: C.blue,
    group: 'everyone',
    label: () => t('Boys'),
    title: () => t('Boys drink'),
    text: () => t('All the boys drink 2.'),
    choose: true,
  },
  'swap-drink': {
    emoji: '🔀',
    color: C.lilac,
    group: 'drink',
    label: () => t('Drink swap'),
    title: () => t('Drink swap'),
    text: (_n, right) => (right ? t('Swap drinks with the player on your right ({name}).', { name: right }) : t('Swap drinks with the player on your right.')),
    ace: true,
    choose: true,
  },
  mole: {
    emoji: '🕳️',
    color: C.brown,
    group: 'move',
    label: () => t('Mole'),
    title: () => t('Mole'),
    text: (n) => (n >= 0 ? t('The mole dug a tunnel: through it you go, back to field {n}.', { n }) : t('The mole dug a tunnel: through it you go, a few rows back.')),
    ace: true,
  },
  mate: {
    emoji: '🤝',
    color: C.mint,
    group: 'game',
    label: () => t('Mate'),
    title: () => t('Mate'),
    text: () => t('Pick a drinking mate: whenever one of you drinks, the other drinks too.'),
    choose: true,
  },
  hands: {
    emoji: '✋',
    color: C.teal,
    group: 'everyone',
    label: () => t('Palm or back'),
    title: () => t('Palm or back'),
    text: () => t('Everyone hides a hand behind their back. On 3, 2, 1 it comes out, palm up or back of the hand up. The fewer drink 2.'),
    choose: true,
  },
};

/** The field kinds in the order the board editor lists them. */
export const KINDS = Object.keys(FIELDS).filter((k) => k !== 'start' && k !== 'goal') as FieldKind[];

export const GROUPS: { id: FieldGroup; label: string }[] = [
  { id: 'drink', label: tx('You drink') },
  { id: 'give', label: tx('You give') },
  { id: 'game', label: tx('Games') },
  { id: 'everyone', label: tx('Everyone') },
  { id: 'move', label: tx('Moving') },
];

/** A field's setting, or its default. */
export const param = (f: Field) => f.n ?? FIELDS[f.kind].param?.def ?? 0;

/** A field with its setting filled in (where it has one). */
export function field(kind: FieldKind, n?: number): Field {
  const p = FIELDS[kind].param;
  return p ? { kind, n: n != null && p.values.includes(n) ? n : p.def } : { kind };
}
