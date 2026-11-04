import { useContext, useState, type CSSProperties, type ReactNode } from 'react';
import BigButton from '../../components/BigButton';
import { t, tx } from '../../i18n';
import { storeSafe } from '../../lib/native';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { useApp, type Player } from '../../state/AppState';
import { BigToss, Countdown, Die, PickPlayer, TOSS_MS, useBigRoll, useRoll } from './bits';
import { field, FIELDS, param, type Field } from './fields';
import { duel, inTurnOrder, keepsUp, leaders, oddMinutes, reverse, rightOf, setPawn, swapSeats, tossPack, trailers, type Game, type Toss } from './logic';

/** What happens once a field is done. */
export interface Outcome {
  update?: (g: Game) => Game;
  /** next: the next player; again: the same player rolls again; travel: over the bridge back or
   *  through the tunnel; back: that many fields back (Roll back). */
  then: 'next' | 'again' | 'travel' | 'back';
  steps?: number;
  /** The Ace up the sleeve was played on it. */
  ace?: boolean;
}

interface Props {
  field: Field;
  pos: number;
  g: Game;
  /** For a bridge back or tunnel: the field it leads to. */
  target?: number;
  players: Player[];
  lander: Player;
  /** Picked with Choose one: done where you stand, no Ace for it. */
  chosen?: boolean;
  onDone: (o: Outcome) => void;
  onChoose: (f: Field) => void;
}

const names = (list: Player[]) => {
  const n = list.map((p) => p.name);
  return n.length <= 1 ? (n[0] ?? '') : t('{names} and {last}', { names: n.slice(0, -1).join(', '), last: n[n.length - 1] });
};

/** The card for the field a player lands on: what to do, and the little games played right there. */
export default function FieldCard({ field: f, pos, g, target, players, lander, chosen, onDone, onChoose }: Props) {
  const info = FIELDS[f.kind];
  const n = param(f);
  const byId = (id: string) => players.find((p) => p.id === id)!;
  const right = byId(rightOf(g, lander.id));
  const others = players.filter((p) => p.id !== lander.id);
  const aces = g.pawns[lander.id]?.aces ?? 0;
  const canAce = !chosen && !!info.ace && aces > 0;

  let body: ReactNode = null;
  let done: Outcome | null = { then: 'next' };
  let doneLabel = t('Done');

  switch (f.kind) {
    case 'ace':
      done = { then: 'next', update: (x) => setPawn(x, lander.id, { aces: x.pawns[lander.id].aces + 1 }) };
      doneLabel = t('Keep it');
      break;
    case 'roll-again':
      done = { then: 'again' };
      doneLabel = t('Roll again');
      break;
    case 'prison':
      done = { then: 'next', update: (x) => setPawn(x, lander.id, { jailed: true }) };
      break;
    case 'back-bridge':
    case 'mole':
      done = { then: 'travel' };
      doneLabel = f.kind === 'mole' ? t('Into the tunnel') : t('Over the bridge');
      break;
    case 'reverse':
      done = { then: 'next', update: reverse };
      break;
    case 'seats':
      done = { then: 'next', update: (x) => swapSeats(x, lander.id) };
      doneLabel = t('Swapped');
      break;
    case 'silence':
      done = { then: 'next', update: (x) => ({ ...x, silence: lander.id }) };
      doneLabel = t('Psst …');
      break;
    case 'leader':
    case 'snail': {
      const who = (f.kind === 'leader' ? leaders(g) : trailers(g)).map(byId);
      body = <Verdict emoji="🍻" title={t('{names}: drink 2', { names: names(who) })} />;
      break;
    }
    case 'clock': {
      const now = new Date();
      const odd = oddMinutes(now);
      const drinks = odd === (n === 1);
      body = (
        <div className="pt-clock">
          <span className="pt-clock-time">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <Verdict emoji={drinks ? '🍻' : '🍀'} title={drinks ? t('{name} drinks 2', { name: lander.name }) : t('Lucky: no drink this time')} />
        </div>
      );
      break;
    }
    case 'rule':
      return <RuleCard {...{ f, pos, lander }} onDone={onDone} chosen={chosen} />;
    case 'mate':
      return <MateCard {...{ f, pos, lander, others }} onDone={onDone} chosen={chosen} />;
    case 'shop':
      return <ShopCard {...{ f, pos, lander }} onDone={onDone} chosen={chosen} />;
    case 'bridge':
      return <BridgeCard {...{ f, pos, lander, canAce }} onDone={onDone} />;
    case 'roll-back':
      return <RollBackCard {...{ f, pos, lander, canAce }} onDone={onDone} />;
    case 'twins':
    case 'duel':
      return <DiceGame {...{ f, pos, lander, others }} onDone={onDone} chosen={chosen} />;
    case 'chance':
      return <ChanceCard {...{ f, pos, lander, others }} onDone={onDone} chosen={chosen} />;
    case 'hands':
      return <HandsCard {...{ f, pos, lander }} onDone={onDone} chosen={chosen} />;
    case 'snus':
      return <SnusCard {...{ f, pos, lander, canAce }} onDone={onDone} chosen={chosen} />;
    case 'tschick':
      return <TschickCard {...{ f, pos, lander }} order={inTurnOrder(g, lander.id).map(byId)} onDone={onDone} chosen={chosen} />;
    case 'double':
      return <DoubleCard {...{ f, pos, lander }} order={inTurnOrder(g, lander.id).map(byId)} onDone={onDone} chosen={chosen} />;
    case 'choose':
      return <ChooseCard {...{ f, pos, lander }} fields={g.fields} onChoose={onChoose} />;
  }

  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={info.text(f.kind === 'back-bridge' || f.kind === 'mole' ? (target ?? -1) : n, right.name)}>
      {body}
      <div className="pt-card-actions">
        {canAce && (
          <button type="button" className="pt-ace-btn" onClick={() => onDone({ then: 'next', ace: true })}>
            🂡 {t('Play your Ace')}
          </button>
        )}
        {done && (
          <BigButton size="xl" onClick={() => onDone(done)}>
            {doneLabel}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

/** The card's frame: the field's colour, its emoji and name, who's on it, what to do. */
function Card({ f, pos, lander, chosen, text, children }: { f: Field; pos: number; lander: Player; chosen?: boolean; text?: string; children?: ReactNode }) {
  const info = FIELDS[f.kind];
  const n = param(f);
  // The group knows the game: a smaller card.
  const known = useApp().knows('party');
  return (
    <div className={`pt-card slide-up${known ? ' known' : ''}`} style={{ '--field': info.color } as CSSProperties}>
      <div className="pt-card-head">
        <span className="pt-card-emoji">{info.emoji}</span>
        <span className="pt-card-heading">
          <span className="pt-card-kicker">{chosen ? t('{name} chose', { name: lander.name }) : t('{name} · field {n}', { name: lander.name, n: pos })}</span>
          <span className="pt-card-title">{info.title(n)}</span>
        </span>
      </div>
      {text && <p className="pt-card-text">{text}</p>}
      {children}
    </div>
  );
}

function Verdict({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="pt-verdict pop-in">
      <span className="pt-verdict-emoji">{emoji}</span>
      <span className="pt-verdict-title">{title}</span>
    </div>
  );
}

interface Sub {
  f: Field;
  pos: number;
  lander: Player;
  chosen?: boolean;
  onDone: (o: Outcome) => void;
}

const textOf = (f: Field) => FIELDS[f.kind].text(param(f), '');

function RuleCard({ f, pos, lander, chosen, onDone }: Sub) {
  const [rule, setRule] = useState('');
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      <input
        type="search"
        className="add-player-input pt-input"
        value={rule}
        maxLength={80}
        placeholder={t('e.g. No first names')}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => setRule(e.target.value)}
      />
      <div className="pt-card-actions">
        <BigButton size="xl" onClick={() => onDone({ then: 'next', update: rule.trim() ? (x) => ({ ...x, rules: [...x.rules, rule.trim()] }) : undefined })}>
          {rule.trim() ? t('Set the rule') : t('No rule')}
        </BigButton>
      </div>
    </Card>
  );
}

function MateCard({ f, pos, lander, others, chosen, onDone }: Sub & { others: Player[] }) {
  const [mate, setMate] = useState<Player | null>(null);
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      <PickPlayer players={others} picked={mate?.id} onPick={setMate} />
      <div className="pt-card-actions">
        <BigButton size="xl" disabled={!mate} onClick={() => mate && onDone({ then: 'next', update: (x) => ({ ...x, mates: [...x.mates, [lander.id, mate.id]] }) })}>
          {mate ? t('Mates with {name}', { name: mate.name }) : t('Pick your mate')}
        </BigButton>
      </div>
    </Card>
  );
}

function ShopCard({ f, pos, lander, chosen, onDone }: Sub) {
  const [n, setN] = useState(3);
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      <div className="pt-stepper">
        <button type="button" className="round-btn" aria-label={t('Fewer')} onClick={() => setN(Math.max(1, n - 1))} disabled={n <= 1}>
          −
        </button>
        <span className="pt-stepper-n">{n}</span>
        <button type="button" className="round-btn" aria-label={t('More')} onClick={() => setN(Math.min(15, n + 1))} disabled={n >= 15}>
          +
        </button>
      </div>
      <p className="pt-card-sub">{t('Drink {n}, then give out {n}.', { n })}</p>
      <div className="pt-card-actions">
        <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
          {t('Bought')}
        </BigButton>
      </div>
    </Card>
  );
}

function BridgeCard({ f, pos, lander, canAce, onDone }: Sub & { canAce: boolean }) {
  // The big die in the middle of the board rolls (no second one on the card).
  const { die, roll } = useBigRoll();
  const [made, setMade] = useState<boolean | null>(null);
  const need = param(f) ? [1, 2] : [5, 6];
  return (
    <Card f={f} pos={pos} lander={lander} text={textOf(f)}>
      {made != null && <Verdict emoji={made ? '🌉' : '🍻'} title={made ? t('Over you go!') : t('Not this time: drink 1 and wait.')} />}
      <div className="pt-card-actions">
        {made == null ? (
          <>
            {canAce && (
              <button type="button" className="pt-ace-btn" onClick={() => onDone({ then: 'again', ace: true, update: (x) => setPawn(x, lander.id, { gate: false, crossed: true }) })}>
                🂡 {t('Play your Ace')}
              </button>
            )}
            <BigButton size="xl" disabled={die.rolling} onClick={async () => setMade(need.includes(await roll()))}>
              {param(f) ? t('Roll a 1 or 2') : t('Roll a 5 or 6')}
            </BigButton>
          </>
        ) : made ? (
          <BigButton size="xl" onClick={() => onDone({ then: 'again', update: (x) => setPawn(x, lander.id, { gate: false, crossed: true }) })}>
            {t('Roll again')}
          </BigButton>
        ) : (
          <BigButton size="xl" onClick={() => onDone({ then: 'next', update: (x) => setPawn(x, lander.id, { gate: true }) })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

function RollBackCard({ f, pos, lander, canAce, onDone }: Sub & { canAce: boolean }) {
  // The big die in the middle of the board rolls (no second one on the card).
  const { roll } = useBigRoll();
  const [rolled, setRolled] = useState(false);
  return (
    <Card f={f} pos={pos} lander={lander} text={textOf(f)}>
      <div className="pt-card-actions">
        {canAce && !rolled && (
          <button type="button" className="pt-ace-btn" onClick={() => onDone({ then: 'next', ace: true })}>
            🂡 {t('Play your Ace')}
          </button>
        )}
        <BigButton
          size="xl"
          disabled={rolled}
          onClick={async () => {
            setRolled(true);
            onDone({ then: 'back', steps: await roll() });
          }}
        >
          {t('Roll')}
        </BigButton>
      </div>
    </Card>
  );
}

/** Twins and the dice duel: pick someone, both roll. */
function DiceGame({ f, pos, lander, others, chosen, onDone }: Sub & { others: Player[] }) {
  const [rival, setRival] = useState<Player | null>(null);
  const a = useRoll();
  const b = useRoll();
  const [rolled, setRolled] = useState<[number, number] | null>(null);
  const twins = f.kind === 'twins';
  const go = async () => {
    const [x, y] = await Promise.all([a.roll(), b.roll()]);
    setRolled([x, y]);
    if (twins && x === y) celebrate();
  };
  let verdict: ReactNode = null;
  let over = false;
  if (rolled && rival) {
    if (twins) {
      over = true;
      verdict =
        rolled[0] === rolled[1] ? (
          <Verdict emoji="👯" title={t('Twins! {a} and {b} give out 10 sips', { a: lander.name, b: rival.name })} />
        ) : (
          <Verdict emoji="🍻" title={t('{a} and {b}: drink 1 each', { a: lander.name, b: rival.name })} />
        );
    } else {
      const d = duel(rolled[0], rolled[1]);
      over = !!d;
      verdict = d ? (
        <Verdict emoji="⚔️" title={t('{name} drinks {n}', { name: (d.loser ? rival : lander).name, n: d.sips })} />
      ) : (
        <Verdict emoji="🔁" title={t('The same! Roll again.')} />
      );
    }
  }
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      {!rival ? (
        <PickPlayer players={others} onPick={setRival} />
      ) : (
        <div className="pt-dice two">
          <span className="pt-dice-who">
            <Die value={a.die.value} rolling={a.die.rolling} big />
            <span>{lander.name}</span>
          </span>
          <span className="pt-dice-who">
            <Die value={b.die.value} rolling={b.die.rolling} big />
            <span>{rival.name}</span>
          </span>
        </div>
      )}
      {verdict}
      <div className="pt-card-actions">
        {rival && !over && (
          <BigButton size="xl" disabled={a.die.rolling} onClick={go}>
            {t('Roll')}
          </BigButton>
        )}
        {over && (
          <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

function ChanceCard({ f, pos, lander, others, chosen, onDone }: Sub & { others: Player[] }) {
  const [rival, setRival] = useState<Player | null>(null);
  const [stage, setStage] = useState<'pick' | 'count' | 'ask' | 'same' | 'not'>('pick');
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      {stage === 'pick' && (
        <PickPlayer
          players={others}
          onPick={(p) => {
            setRival(p);
            setStage('count');
          }}
        />
      )}
      {stage === 'count' && <Countdown onDone={() => setStage('ask')} />}
      {stage === 'same' && rival && <Verdict emoji="🎯" title={t('The same! {a} and {b} give out 2 each', { a: lander.name, b: rival.name })} />}
      {stage === 'not' && rival && <Verdict emoji="🍻" title={t('{a} and {b}: drink 2 each', { a: lander.name, b: rival.name })} />}
      <div className="pt-card-actions">
        {stage === 'ask' && (
          <div className="pt-two">
            <BigButton
              size="lg"
              onClick={() => {
                celebrate();
                setStage('same');
              }}
            >
              {t('Same number')}
            </BigButton>
            <BigButton size="lg" variant="light" onClick={() => setStage('not')}>
              {t('Different')}
            </BigButton>
          </div>
        )}
        {(stage === 'same' || stage === 'not') && (
          <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

function HandsCard({ f, pos, lander, chosen, onDone }: Sub) {
  const [stage, setStage] = useState<'ready' | 'count' | 'now'>('ready');
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      {stage === 'count' && <Countdown onDone={() => setStage('now')} />}
      {stage === 'now' && <Verdict emoji="✋" title={t('Hands out! The fewer drink 2.')} />}
      <div className="pt-card-actions">
        {stage === 'ready' && (
          <BigButton size="xl" onClick={() => setStage('count')}>
            {t('Count down: 3, 2, 1')}
          </BigButton>
        )}
        {stage === 'now' && (
          <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

function SnusCard({ f, pos, lander, chosen, canAce, onDone }: Sub & { canAce: boolean }) {
  const [call, setCall] = useState<boolean | null>(null);
  const [lid, setLid] = useState<boolean | null>(null);
  const [landed, setLanded] = useState(false);
  // The tin is flipped onto the middle of the board, as big as the die (Play shows it).
  const toss = useContext(BigToss);
  const go = (callLid: boolean) => {
    const up = Math.random() < 0.5;
    setCall(callLid);
    setLid(up);
    toss?.({ kind: 'tin', result: up ? 1 : 0 });
    sfx.tick();
    window.setTimeout(() => {
      setLanded(true);
      buzz(30);
    }, TOSS_MS + 100);
  };
  const right = landed && call === lid;
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={textOf(f)}>
      {landed && (
        <Verdict
          emoji={right ? '🎉' : '🍻'}
          title={
            right
              ? t('{side} up: right! {name} gives out 2', { side: lid ? t('Lid') : t('Bottom'), name: lander.name })
              : t('{side} up: wrong! {name} drinks 2', { side: lid ? t('Lid') : t('Bottom'), name: lander.name })
          }
        />
      )}
      <div className="pt-card-actions">
        {call == null && (
          <>
            {canAce && !chosen && (
              <button type="button" className="pt-ace-btn" onClick={() => onDone({ then: 'next', ace: true })}>
                🂡 {t('Play your Ace')}
              </button>
            )}
            <div className="pt-two">
              <BigButton size="lg" onClick={() => go(true)}>
                {t('Lid')}
              </BigButton>
              <BigButton size="lg" variant="light" onClick={() => go(false)}>
                {t('Bottom')}
              </BigButton>
            </div>
          </>
        )}
        {landed && (
          <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

const TOSS: Record<Toss, string> = { 1: tx('Flat'), 2: tx('On its side'), 3: tx('Upright') };

function TschickCard({ f, pos, lander, chosen, order, onDone }: Sub & { order: Player[] }) {
  const [throws, setThrows] = useState<{ p: Player; toss: Toss }[]>([]);
  const [flying, setFlying] = useState(false);
  const [lost, setLost] = useState(false);
  const thrower = order[throws.length % order.length];
  const last = throws[throws.length - 1];
  const pot = throws.reduce((s, x) => s + x.toss, 0);
  // The pack is flipped onto the middle of the board, as big as the die (Play shows it).
  const throwPack = useContext(BigToss);
  const go = () => {
    const toss = tossPack();
    setFlying(true);
    setThrows((x) => [...x, { p: thrower, toss }]);
    throwPack?.({ kind: 'pack', result: toss });
    sfx.tick();
    window.setTimeout(() => {
      setFlying(false);
      buzz(toss === 3 ? [40, 40, 80] : 25);
      if (!keepsUp(last?.toss ?? null, toss)) setLost(true);
    }, TOSS_MS + 50);
  };
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={throws.length ? undefined : textOf(f)}>
      {throws.length > 0 && (
        <div className="pt-tschick-line">
          <span>{flying ? t('{name} flips …', { name: last.p.name }) : t('{name}: {toss} (+{n})', { name: last.p.name, toss: t(TOSS[last.toss]), n: last.toss })}</span>
          <span className="pt-pot">{t('Pot: {n} sips', { n: flying ? pot - last.toss : pot })}</span>
        </div>
      )}
      {lost && !flying && <Verdict emoji="🍻" title={t('{name} can’t keep up and drinks {n}', { name: last.p.name, n: pot })} />}
      <div className="pt-card-actions">
        {!lost && (
          <BigButton size="xl" disabled={flying} onClick={go}>
            {t('{name}: flip it', { name: thrower.name })}
          </BigButton>
        )}
        {lost && !flying && (
          <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

function DoubleCard({ f, pos, lander, chosen, order, onDone }: Sub & { order: Player[] }) {
  // The big die in the middle of the board rolls (no second one on the card).
  const { die, roll } = useBigRoll();
  const [step, setStep] = useState(0);
  const [end, setEnd] = useState<{ who: Player; n: number } | null>(null);
  const who = order[step % order.length];
  // In the store app it stops doubling at 4 (no runaway rounds).
  const n = storeSafe ? Math.min(4, 2 ** step) : 2 ** step;
  return (
    <Card f={f} pos={pos} lander={lander} chosen={chosen} text={step ? undefined : textOf(f)}>
      <div className="pt-double">
        <span className="pt-double-n">{n}</span>
        <span className="pt-double-who">{t('{name}: drink {n}, or roll a 5 or 6 to pass on {m}', { name: who.name, n, m: storeSafe ? Math.min(4, n * 2) : n * 2 })}</span>
      </div>
      {end && <Verdict emoji="🍻" title={t('{name} drinks {n}', { name: end.who.name, n: end.n })} />}
      <div className="pt-card-actions">
        {!end ? (
          <div className="pt-two">
            <BigButton size="lg" variant="light" disabled={die.rolling} onClick={() => setEnd({ who, n })}>
              {t('Drink {n}', { n })}
            </BigButton>
            <BigButton
              size="lg"
              disabled={die.rolling}
              onClick={async () => {
                const v = await roll();
                if (v >= 5) setStep(step + 1);
                else setEnd({ who, n });
              }}
            >
              {t('Roll')}
            </BigButton>
          </div>
        ) : (
          <BigButton size="xl" onClick={() => onDone({ then: 'next' })}>
            {t('Done')}
          </BigButton>
        )}
      </div>
    </Card>
  );
}

function ChooseCard({ f, pos, lander, fields, onChoose }: Omit<Sub, 'onDone'> & { fields: Field[]; onChoose: (f: Field) => void }) {
  // Every field on this board that gives no advantage and moves nobody, once each.
  const seen = new Set<string>();
  const options = fields.filter((x) => {
    const key = `${x.kind}:${param(x)}`;
    if (!FIELDS[x.kind].choose || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <Card f={f} pos={pos} lander={lander} text={textOf(f)}>
      <div className="pt-choose">
        {options.map((o) => (
          <button
            key={`${o.kind}:${param(o)}`}
            type="button"
            className="pt-choose-btn"
            style={{ '--field': FIELDS[o.kind].color } as CSSProperties}
            onClick={() => {
              sfx.pop();
              buzz();
              onChoose(field(o.kind, o.n));
            }}
          >
            <span className="pt-choose-emoji">{FIELDS[o.kind].emoji}</span>
            <span className="pt-choose-label">{FIELDS[o.kind].title(param(o))}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
