/*
 * The pictures inside the games (a card's rule, a field on the board, a verdict, a pawn): line icons
 * of one set, drawn in one stroke with the colour of what's around them. Most come from Lucide (ISC
 * licence); the few it doesn't have are drawn here the same way (a 24 × 24 grid, round ends).
 * The same picture is drawn as SVG on the page (components/Glyph.tsx) and on a canvas (the Party
 * board and its pawns: `drawGlyph`).
 */
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpToLine,
  Armchair,
  Baby,
  BatteryLow,
  Ban,
  Beer,
  Bird,
  BookOpen,
  BottleWine,
  Bomb,
  Bridge,
  Bus,
  Cake,
  CalendarDays,
  ChessKing,
  ChessPawn,
  CircleCheck,
  CircleQuestionMark,
  CircleX,
  Cigarette,
  ClipboardList,
  Clock,
  Clover,
  Coffee,
  Coins,
  Crown,
  CupSoda,
  Dices,
  Drama,
  Droplet,
  Ear,
  Ellipsis,
  EighthNotes,
  Eraser,
  Eye,
  EyeOff,
  FaceAngry,
  FaceExpressionless,
  FaceGrinning,
  FaceNeutral,
  FaceSlightlySmiling,
  Flag,
  FlagTriangleRight,
  Flame,
  FlaskConical,
  Footprints,
  Ghost,
  Gift,
  Glasses,
  Goal,
  GlassWater,
  Hand,
  HandFist,
  HandHeart,
  HandMetal,
  Handshake,
  Hash,
  Heart,
  HeartCrack,
  HeartHandshake,
  Hourglass,
  House,
  Languages,
  Link,
  ListOrdered,
  LockOpen,
  Map as MapIcon,
  Mars,
  Medal,
  MessageCircleHeart,
  MessageCircleQuestionMark,
  MessageCircleX,
  MicVocal,
  Mouth,
  MouthOff,
  Package,
  PartyPopper,
  Pause,
  Pencil,
  PenTool,
  Pizza,
  Play,
  PlayingCards,
  Pointer,
  Repeat,
  Rewind,
  Rocket,
  Ruler,
  Scissors,
  ScrollText,
  Shield,
  ShoppingCart,
  Shuffle,
  Skull,
  Smartphone,
  Snail,
  Sofa,
  Speech,
  SportShoe,
  Star,
  Swords,
  Target,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Toilet,
  TriangleAlert,
  Trophy,
  Undo2,
  User,
  UserRound,
  Users,
  UsersRound,
  Venus,
  VenetianMask,
  WavesHorizontal,
  Wine,
  X,
  Zap,
} from 'lucide';

/** One picture: SVG elements with their attributes (Lucide's own form). */
export type GlyphNode = [tag: string, attrs: Record<string, string | number | undefined>][];

/* Drawn here: what Lucide has no picture of. */
const Unicorn: GlyphNode = [
  ['path', { d: 'M17 21c0-5 1-9.6-1.5-13.5l-.7-3.3L13 6.6c-2 .2-3.6 1.2-4.8 3L4.6 14.4c-.6.8-.2 2.2 1 2.2l3-.2c1.2 0 2 1 1.8 4.6' }],
  ['path', { d: 'M10.2 7.3 8 2.4l4.4 4.1' }],
  ['path', { d: 'M15.6 7.6c1.6.4 2.6 1.6 3 3M17.4 12.2c1.4.4 2.3 1.4 2.6 2.8' }],
  ['circle', { cx: '10.6', cy: '10.2', r: '.7', fill: 'currentColor' }],
];
const Frog: GlyphNode = [
  ['path', { d: 'M5.3 9.2A3 3 0 1 1 10.7 7.4h2.6a3 3 0 1 1 5.4 1.8c1.6 1.2 2.8 3 2.8 5 0 3.8-4 6.3-9.5 6.3S2.5 18 2.5 14.2c0-2 1.2-3.8 2.8-5z' }],
  ['circle', { cx: '8', cy: '7.6', r: '.9', fill: 'currentColor' }],
  ['circle', { cx: '16', cy: '7.6', r: '.9', fill: 'currentColor' }],
  ['path', { d: 'M8.5 14.5c2.2 1.4 4.8 1.4 7 0' }],
];
const Dino: GlyphNode = [
  ['path', { d: 'M2 15.5c3.5-.3 5-4.5 9-4.9 2-.2 3.6.4 4.4 1l.8-6.4c.1-.8.7-1.4 1.5-1.4H20c.6 0 1 .4 1 1v.8c0 .5-.4.9-.9.9h-1.7l-.4 6.7c-.1.8-.3 1.4-.4 2.2v5.1h-2V17c-2 .6-4 .6-6 .2v3.3h-2v-4.1c-2 0-4-.2-5.6-.9z' }],
  ['circle', { cx: '18.4', cy: '5.1', r: '.55', fill: 'currentColor' }],
];
const CowboyHat: GlyphNode = [
  ['path', { d: 'M2.5 13.4c1.4 2.6 5 3.9 9.5 3.9s8.1-1.3 9.5-3.9' }],
  ['path', { d: 'M6.2 14.6 7.4 7c.2-1.4 1.6-2.3 3-1.9l.8.2c.5.2 1.1.2 1.6 0l.8-.2c1.4-.4 2.8.5 3 1.9l1.2 7.6' }],
  ['path', { d: 'M7 11.6c3.2 1 6.8 1 10 0' }],
];
const Pineapple: GlyphNode = [
  ['path', { d: 'M12 21.5c3.3 0 5.6-2.7 5.6-6.4S15.3 8.6 12 8.6 6.4 11.4 6.4 15.1s2.3 6.4 5.6 6.4z' }],
  ['path', { d: 'm8.3 12.2 7.4 7.4M7.1 16.2l4.6 4.6M11 9.2l5.7 5.7M15.7 12.2l-7.4 7.4M16.9 16.2l-4.6 4.6M13 9.2l-5.7 5.7' }],
  ['path', { d: 'M12 8.6V5.2M12 6.6c-.6-1.8-2-3-3.8-3.4M12 6.6c.6-1.8 2-3 3.8-3.4M12 5.2c0-1.1.4-2.1 1.1-2.7' }],
];
const Alien: GlyphNode = [
  ['path', { d: 'M12 21.5c-1.6 0-3.1-1.2-4.6-2.9C5 15.9 3.6 12.7 3.6 10.2 3.6 5.5 7.4 2.5 12 2.5s8.4 3 8.4 7.7c0 2.5-1.4 5.7-3.8 8.4-1.5 1.7-3 2.9-4.6 2.9z' }],
  ['path', { d: 'M6.7 10.1c2 0 3.6 1.2 3.9 3-2 .3-3.7-.7-3.9-3zM17.3 10.1c-2 0-3.6 1.2-3.9 3 2 .3 3.7-.7 3.9-3z', fill: 'currentColor' }],
  ['path', { d: 'M10.8 17.2h2.4' }],
];
const Nose: GlyphNode = [
  ['path', { d: 'M12.4 3.5c-.4 3.6-1.6 7-3.6 9.8-1 1.4-.6 3.4 1 4.2 1.4.7 3 .7 4.4.1 1.5-.6 2.1-2.4 1.2-3.8' }],
  ['path', { d: 'M9.3 17.8c-.9 1-.8 2.4.2 3M15.1 17.6c.9.9 1 2.3.1 3' }],
];
const Pyramid: GlyphNode = [['path', { d: 'M12 3.5 2.8 19.5h18.4z' }], ['path', { d: 'M7.4 11.5h9.2M5.1 15.5h13.8' }]];
const Prison: GlyphNode = [
  ['rect', { x: '3.5', y: '3.5', width: '17', height: '17', rx: '2.5' }],
  ['path', { d: 'M8.2 3.5v17M12 3.5v17M15.8 3.5v17' }],
];
const Seven: GlyphNode = [['path', { d: 'M7 4.5h10l-6.5 15' }], ['path', { d: 'M9.5 12h6' }]];
const Hole: GlyphNode = [
  ['ellipse', { cx: '12', cy: '15', rx: '8.5', ry: '4' }],
  ['path', { d: 'M6.4 15.6c1.4.8 3.4 1.2 5.6 1.2s4.2-.4 5.6-1.2' }],
  ['path', { d: 'M12 3.5v6M9.4 7.2 12 9.8l2.6-2.6' }],
];
const Twins: GlyphNode = [
  ['circle', { cx: '8', cy: '7.5', r: '3' }],
  ['circle', { cx: '16', cy: '7.5', r: '3' }],
  ['path', { d: 'M3 20c.4-3.6 2.4-6 5-6s4.6 2.4 5 6M11 20c.4-3.6 2.4-6 5-6s4.6 2.4 5 6' }],
];
const GLYPHS = {
  // Drinks
  beer: Beer,
  cheers: Wine,
  bottle: BottleWine,
  shot: GlassWater,
  flask: FlaskConical,
  smoke: Cigarette,
  coffee: Coffee,
  water: Droplet,
  juice: CupSoda,
  // People and hands
  you: Pointer,
  me: Hand,
  hand: Hand,
  slap: HandFist,
  rock: HandMetal,
  heartHand: HandHeart,
  mate: Handshake,
  thumb: ThumbsUp,
  thumbDown: ThumbsDown,
  guys: Mars,
  girls: Venus,
  person: User,
  personRound: UserRound,
  people: Users,
  group: UsersRound,
  twins: Twins,
  baby: Baby,
  oldest: Hourglass,
  // Faces
  grin: FaceGrinning,
  smile: FaceSlightlySmiling,
  neutral: FaceNeutral,
  blank: FaceExpressionless,
  angry: FaceAngry,
  skull: Skull,
  ghost: Ghost,
  mouth: Mouth,
  silence: MouthOff,
  nose: Nose,
  ear: Ear,
  eye: Eye,
  eyeOff: EyeOff,
  glasses: Glasses,
  haircut: Scissors,
  mask: VenetianMask,
  drama: Drama,
  // Talk
  rhyme: MicVocal,
  speech: Speech,
  accent: Languages,
  question: CircleQuestionMark,
  ask: MessageCircleQuestionMark,
  compliment: MessageCircleHeart,
  noSwear: MessageCircleX,
  story: BookOpen,
  // Rules and lists
  rule: ScrollText,
  category: ClipboardList,
  count: ListOrdered,
  seven: Seven,
  hash: Hash,
  ban: Ban,
  // Directions and moves
  up: ArrowUp,
  down: ArrowDown,
  floor: ArrowDownToLine,
  heaven: ArrowUpToLine,
  swap: ArrowLeftRight,
  again: Repeat,
  shuffle: Shuffle,
  back: Rewind,
  waterfall: WavesHorizontal,
  // Game things
  crown: Crown,
  king: ChessKing,
  pawn: ChessPawn,
  dice: Dices,
  target: Target,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  flag: Flag,
  finish: FlagTriangleRight,
  goal: Goal,
  gift: Gift,
  party: PartyPopper,
  music: EighthNotes,
  clover: Clover,
  swords: Swords,
  shield: Shield,
  fire: Flame,
  zap: Zap,
  heart: Heart,
  heartCrack: HeartCrack,
  love: HeartHandshake,
  check: CircleCheck,
  wrong: CircleX,
  times: X,
  pyramid: Pyramid,
  bus: Bus,
  // Places and objects
  bridge: Bridge,
  house: House,
  sofa: Sofa,
  seat: Armchair,
  battery: BatteryLow,
  pen: PenTool,
  toilet: Toilet,
  prison: Prison,
  unlock: LockOpen,
  chain: Link,
  hole: Hole,
  cart: ShoppingCart,
  pack: Package,
  scissors: Scissors,
  ruler: Ruler,
  clock: Clock,
  calendar: CalendarDays,
  coins: Coins,
  bomb: Bomb,
  timer: Timer,
  cake: Cake,
  snail: Snail,
  shoe: SportShoe,
  footprints: Footprints,
  eraser: Eraser,
  pencil: Pencil,
  map: MapIcon,
  phone: Smartphone,
  pause: Pause,
  undo: Undo2,
  more: Ellipsis,
  alert: TriangleAlert,
  cards: PlayingCards,
  play: Play,
  // Pawns
  unicorn: Unicorn,
  bird: Bird,
  frog: Frog,
  dino: Dino,
  cowboy: CowboyHat,
  pineapple: Pineapple,
  pizza: Pizza,
  alien: Alien,
  rocket: Rocket,
} satisfies Record<string, GlyphNode>;

export type GlyphName = keyof typeof GLYPHS;

export const glyphNode = (name: GlyphName): GlyphNode => GLYPHS[name];

const num = (v: string | number | undefined) => (typeof v === 'number' ? v : parseFloat(v ?? '0') || 0);

/** One element of a picture as a canvas path (in the picture's 24 × 24 units). */
function pathOf(tag: string, a: Record<string, string | number | undefined>): Path2D {
  const p = new Path2D();
  switch (tag) {
    case 'path':
      return new Path2D(String(a.d ?? ''));
    case 'circle':
      p.arc(num(a.cx), num(a.cy), num(a.r), 0, Math.PI * 2);
      return p;
    case 'ellipse':
      p.ellipse(num(a.cx), num(a.cy), num(a.rx), num(a.ry), 0, 0, Math.PI * 2);
      return p;
    case 'rect': {
      const [x, y, w, h] = [num(a.x), num(a.y), num(a.width), num(a.height)];
      const r = Math.min(num(a.rx ?? a.ry), w / 2, h / 2);
      if (r > 0 && typeof p.roundRect === 'function') p.roundRect(x, y, w, h, r);
      else p.rect(x, y, w, h);
      return p;
    }
    case 'line':
      p.moveTo(num(a.x1), num(a.y1));
      p.lineTo(num(a.x2), num(a.y2));
      return p;
    case 'polyline':
    case 'polygon': {
      const pts = String(a.points ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      for (let i = 0; i + 1 < pts.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, pts[i], pts[i + 1]);
      if (tag === 'polygon') p.closePath();
      return p;
    }
  }
  return p;
}

const paths = new Map<GlyphName, { path: Path2D; fill: boolean }[]>();

/**
 * Draws a picture on a canvas: `size` px square, its top left corner at x, y, in `color`, the line
 * `weight` units thick (of 24, as on the page).
 */
export function drawGlyph(ctx: CanvasRenderingContext2D, name: GlyphName, x: number, y: number, size: number, color: string, weight = 2) {
  let parts = paths.get(name);
  if (!parts) {
    parts = GLYPHS[name].map(([tag, a]) => ({ path: pathOf(tag, a), fill: a.fill === 'currentColor' }));
    paths.set(name, parts);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const { path, fill } of parts) {
    if (fill) ctx.fill(path);
    ctx.stroke(path);
  }
  ctx.restore();
}
