import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Finished from '../../components/Finished';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { pick, shuffle } from '../../lib/random';
import { useTurnBubble } from '../../lib/turn';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';

/**
 * A choice on the setup screen: who the cards are about. `mixed` picks one of the others per card
 * (and shows their emoji together, so it has none of its own).
 */
export interface Mode {
  id: string;
  emoji?: string;
  /** Already translated: the button's name (it shows just the emoji). */
  label: string;
  mixed?: boolean;
}

/** One card on the table: its text, who it's about (a mode's id, or '' without modes), and who reads it out. */
export interface Round {
  text: string;
  who: string;
  reader: number;
}

export interface CardGameProps<C> extends GameProps {
  game: string;
  cards: readonly string[];
  /** Who the cards are about, picked before the game (none: it starts right away). */
  modes?: Mode[];
  /** The setup screen's question, e.g. "Who's it about?". Already translated. */
  modeTitle?: string;
  /** How it works, in a line (on the setup screen, until the group knows the game). Already translated. */
  intro?: string;
  /** The card, big: the statement to read out. */
  Card: (p: { round: Round }) => ReactNode;
  /**
   * One tap for the whole table (no going round), and the next card follows by itself. Without it,
   * the card is just for talking about, and a Next button deals the next one.
   */
  Choice?: (p: { round: Round; chosen: C | null; choose: (c: C) => void }) => ReactNode;
  /** What the table chose over the game, on the last screen (`mode`: the mode's id, '' without modes). */
  Summary?: (p: { picks: C[]; mode: string }) => ReactNode;
}

/**
 * Shrinks the card's type (CSS --fit) until the statement fits the card, so a long one on a small
 * phone isn't cut off. Again for every card, and when the screen changes size.
 */
function useFit(stage: RefObject<HTMLDivElement | null>, card: unknown) {
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const c = el.querySelector<HTMLElement>('.vt-card');
      if (!c) return;
      let f = 1;
      c.style.setProperty('--fit', '1');
      while (c.scrollHeight > c.clientHeight + 1 && f > 0.5) {
        f = Math.round((f - 0.05) * 100) / 100;
        c.style.setProperty('--fit', String(f));
      }
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, [stage, card]);
}

/** How long the table's tap stays on screen (the stamp, the hop) before the next card. */
const CHOSEN_MS = 900;

interface State<C> {
  deck: string[];
  drawn: number;
  mode: string;
  round: Round;
  chosen: C | null;
  picks: C[];
  over: boolean;
}

/**
 * The two card games for talking (Princess/King Treatment, He's a 10/10 but…): a card goes on the
 * table, big, the one whose turn it is reads it out, everyone talks about it. Princess/King: the
 * table settles it with one tap, bare minimum or treatment. Then the next card, the next reader.
 */
export default function CardGame<C>(props: CardGameProps<C>) {
  const { game, players, exit, cards, modes, Card, Choice, Summary } = props;
  const known = useApp().knows(game);
  const [mode, setMode] = useState(modes ? modes[modes.length - 1].id : '');

  /** Who a card is about: the mode picked, or one of the others at random for a mixed one. */
  const whoFor = (id: string) => (modes?.find((m) => m.id === id)?.mixed ? pick(modes.filter((m) => !m.mixed)).id : id);
  const deal = (modeId: string): State<C> => {
    const deck = shuffle(cards);
    return { deck, drawn: 1, mode: modeId, round: { text: deck[0], who: whoFor(modeId), reader: 0 }, chosen: null, picks: [], over: false };
  };
  // Without anything to pick first, the first card is on the table right away.
  const [s, setS] = useState<State<C> | null>(() => (modes ? null : deal('')));

  /** The next card (with the next reader), or the end once the cards are out. */
  const advance = (prev: State<C>): State<C> => {
    const picks = prev.chosen != null ? [...prev.picks, prev.chosen] : prev.picks;
    if (prev.drawn >= prev.deck.length) return { ...prev, picks, chosen: null, over: true };
    return {
      ...prev,
      drawn: prev.drawn + 1,
      round: { text: prev.deck[prev.drawn], who: whoFor(prev.mode), reader: players.length ? (prev.round.reader + 1) % players.length : 0 },
      chosen: null,
      picks,
    };
  };

  // Without a player list nobody reads in turn: the table just plays.
  const reader = s && !s.over && players.length ? players[s.round.reader % players.length] : null;
  useTurnBubble(reader);
  const stage = useRef<HTMLDivElement>(null);
  useFit(stage, s && !s.over ? s.drawn : null);

  // Tapped: a moment for the stamp, then the next card by itself (another tap in that moment
  // changes the choice and starts the moment again).
  const card = s && !s.over ? s.drawn : 0;
  const chosen = s?.chosen ?? null;
  useEffect(() => {
    if (!Choice || !card || chosen == null) return;
    const id = setTimeout(() => setS((prev) => (prev && !prev.over && prev.drawn === card ? advance(prev) : prev)), CHOSEN_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance only reads what the card key pins
  }, [Choice, card, chosen]);

  /* ---------- Before the game: who the cards are about ---------- */
  if (!s) {
    return (
      <div className="bd vt">
        <section className="section">
          <h3 className="section-title">{props.modeTitle}</h3>
          {/* Small cards, one per choice, their face the emoji the cards will be about. */}
          <div className="vt-picks" style={{ '--n': modes!.length } as CSSProperties}>
            {modes!.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`vt-pick${mode === m.id ? ' on' : ''}${m.mixed ? ' mixed' : ''}`}
                aria-pressed={mode === m.id}
                aria-label={m.label}
                onClick={() => setMode(m.id)}
              >
                {(m.mixed ? modes!.filter((o) => !o.mixed) : [m]).map((o) => (
                  <span key={o.id} className="vt-pick-emoji" aria-hidden="true">
                    {o.emoji}
                  </span>
                ))}
              </button>
            ))}
          </div>
        </section>
        {!known && props.intro && <p className="fine-print">{props.intro}</p>}
        <div className="sticky-action">
          <BigButton size="xl" onClick={() => setS(deal(mode))}>
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  const next = () => {
    sfx.pop();
    buzz(10);
    setS(advance(s));
  };

  if (s.over) {
    return (
      <div className="bd vt">
        <Finished game={game} />
        <div className="bd-head center">
          <span className="kicker">{t('Game over')}</span>
          <h2 className="bd-title big">{t('All cards played!')}</h2>
        </div>
        {Summary && <Summary picks={s.picks} mode={s.mode} />}
        <div className="sticky-action stack">
          <BigButton onClick={() => setS(deal(s.mode))}>{t('Play again')}</BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="vt fill">
      {/* Counted as played from the second card on. */}
      {s.drawn > 1 && <Finished game={game} />}
      <div className="kc-status vt-status">
        {reader && (
          <div className="bd-player">
            <span className="bd-avatar" style={{ background: reader.color }}>
              <Avatar avatar={reader.avatar} photo={reader.photo} />
            </span>
            <span className="bd-player-text">
              <span className="bd-player-name">{reader.name}</span>
              <span className="bd-player-sub">{t('reads it out')}</span>
            </span>
          </div>
        )}
        <span className="vt-count">{t('{n} of {total}', { n: s.drawn, total: s.deck.length })}</span>
      </div>
      <div ref={stage} className="vt-stage">
        <div key={s.drawn} className="vt-card-in">
          <Card round={s.round} />
        </div>
      </div>
      {Choice && (
        <Choice
          round={s.round}
          chosen={s.chosen}
          choose={(c) => {
            sfx.pop();
            buzz([20, 40, 30]);
            setS({ ...s, chosen: c });
          }}
        />
      )}
      {!Choice && (
        <div className="vt-next">
          <BigButton size="xl" onClick={next}>
            {s.drawn >= s.deck.length ? t('Finish game') : t('Next')}
          </BigButton>
        </div>
      )}
    </div>
  );
}
