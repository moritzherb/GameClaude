import { t } from '../../i18n';
import { pick, randomInt } from '../../lib/random';

/** What the wheel hands out: the text, and the sips it gives everyone (for the drink counter). */
export interface Fate {
  text: string;
  /** Sips per player (same order as the players). Sips that the chosen player hands out aren't known here. */
  sips: number[];
}

type Make = (chosen: number, count: number) => Fate;

const none = (count: number) => Array<number>(count).fill(0);
/** Only the chosen player drinks n. */
const solo = (chosen: number, count: number, n: number) => none(count).map((_, i) => (i === chosen ? n : 0));
/** Everybody drinks n (optionally everybody but the chosen player). */
const everyone = (count: number, n: number, except?: number) => none(count).map((_, i) => (i === except ? 0 : n));
const sips = (n: number) => (n === 1 ? t('{n} sip', { n }) : t('{n} sips', { n }));

// Picked when the wheel stops (at runtime), so t() is fine here.
export const FATES: Make[] = [
  // Plain drinking
  (c, k) => {
    const n = randomInt(1, 3);
    return { text: n === 1 ? t('Drink {n} sip', { n }) : t('Drink {n} sips', { n }), sips: solo(c, k, n) };
  },
  (c, k) => {
    const n = randomInt(3, 4);
    return { text: t('Bad luck: drink {sips}.', { sips: sips(n) }), sips: solo(c, k, n) };
  },
  (c, k) => ({ text: t('Finish your drink!'), sips: solo(c, k, 3) }),
  (c, k) => ({ text: t('Drink with no hands.'), sips: solo(c, k, 1) }),
  (c, k) => ({ text: t('Drink with your other hand. Everyone watches.'), sips: solo(c, k, 1) }),
  (c, k) => ({ text: t('Jackpot! Drink 2 sips and hand out 2.'), sips: solo(c, k, 2) }),
  (c, k) => ({ text: t('Double or nothing: drink 1 and spin again.'), sips: solo(c, k, 1) }),
  // Everybody
  (_c, k) => ({ text: t('Everybody drinks!'), sips: everyone(k, 1) }),
  (c, k) => ({ text: t('Everybody but you drinks.'), sips: everyone(k, 1, c) }),
  (_c, k) => ({ text: t('Cheers! Clink glasses with everyone, then everybody drinks.'), sips: everyone(k, 1) }),
  (c, k) => ({ text: t('Waterfall – you start!'), sips: solo(c, k, 1) }),
  // Hand it out
  (_c, k) => ({ text: t('Give out {n} sips', { n: randomInt(2, 4) }), sips: none(k) }),
  (_c, k) => ({ text: t('Split {n} sips between two players.', { n: randomInt(3, 5) }), sips: none(k) }),
  (_c, k) => ({ text: t('Pick a drinking buddy. Until the next spin, they drink whenever you do.'), sips: none(k) }),
  (_c, k) => ({ text: t('Lucky you: pick someone to drink {sips}.', { sips: sips(randomInt(2, 3)) }), sips: none(k) }),
  (_c, k) => ({ text: t('Safe! Drink some water.'), sips: none(k) }),
  // Little games
  (_c, k) => ({ text: t('Rhyme time: say a word. Go round rhyming on it. Whoever can’t, drinks 2.'), sips: none(k) }),
  (_c, k) => ({ text: t('Pick a category. Go round naming things. Whoever stalls, drinks 2.'), sips: none(k) }),
  (_c, k) => ({ text: t('Never have I ever: say one. Everyone who has, drinks.'), sips: none(k) }),
  (_c, k) => ({ text: t('“Most likely to …”: finish the sentence. On 3 everyone points. Most fingers drinks.'), sips: none(k) }),
  (_c, k) => ({ text: t('Thumb master: put your thumb on the table any time before the next spin. Last one to follow drinks.'), sips: none(k) }),
  (_c, k) => ({ text: t('Question master: until the next spin, whoever answers one of your questions drinks.'), sips: none(k) }),
  (_c, k) => ({ text: t('Make a rule. It stays until the next spin. Break it, drink.'), sips: none(k) }),
  (_c, k) => ({ text: t('Staring contest with anyone you like. First to blink drinks 2.'), sips: none(k) }),
  (_c, k) => ({ text: t('Rock, paper, scissors against the person on your right. Loser drinks 2.'), sips: none(k) }),
  (_c, k) => ({ text: t('Name 5 beer brands in 10 seconds. Fail and you drink 2.'), sips: none(k) }),
  // Dares
  (_c, k) => ({ text: t('Hot seat: everyone asks you one question. Skip one, drink 1.'), sips: none(k) }),
  (_c, k) => ({ text: t('Tell your most embarrassing story or drink 3.'), sips: none(k) }),
  (_c, k) => ({ text: t('Show the last photo on your phone or drink 3.'), sips: none(k) }),
  (_c, k) => ({ text: t('Give everyone a compliment or drink 3.'), sips: none(k) }),
  (_c, k) => ({ text: t('Speak with an accent until the next spin. Every slip: 1 sip.'), sips: none(k) }),
  (_c, k) => ({ text: t('Silence! Not a word until the next spin. Every word: 1 sip.'), sips: none(k) }),
  (_c, k) => ({ text: t('No names until the next spin. Whoever says one, drinks.'), sips: none(k) }),
  (_c, k) => ({ text: t('Do your best impression of someone here. Whoever guesses it first hands out 2.'), sips: none(k) }),
];

export const spinFate = (chosen: number, count: number): Fate => pick(FATES)(chosen, count);
