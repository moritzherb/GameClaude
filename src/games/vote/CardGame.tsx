import { useState, type ReactNode } from 'react';
import Avatar from '../../components/Avatar';
import BigButton from '../../components/BigButton';
import Finished from '../../components/Finished';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { pick, shuffle } from '../../lib/random';
import { useTurnBubble } from '../../lib/turn';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';

/** A choice on the setup screen: who the cards are about. `mixed` picks one of the others per card. */
export interface Mode {
  id: string;
  emoji: string;
  /** Already translated. */
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
  /** One tap for the whole table (no going round): without it, the card is just for talking about. */
  Choice?: (p: { round: Round; chosen: C | null; choose: (c: C) => void }) => ReactNode;
  /** What the table chose over the game, on the last screen. */
  Summary?: (p: { picks: C[] }) => ReactNode;
}

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
 * table settles it with one tap. Then the next card, the next reader.
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

  const reader = s && !s.over ? players[s.round.reader % players.length] : null;
  useTurnBubble(reader);

  /* ---------- Before the game: who the cards are about ---------- */
  if (!s) {
    return (
      <div className="bd vt">
        <section className="section">
          <h3 className="section-title">{props.modeTitle}</h3>
          <div className={`seg ${modes!.length === 2 ? 'two' : 'three'}`}>
            {modes!.map((m) => (
              <button key={m.id} type="button" className={`seg-btn${mode === m.id ? ' active' : ''}`} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                <span className="vt-seg-emoji" aria-hidden="true">
                  {m.emoji}
                </span>
                <span className="seg-sub">{m.label}</span>
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
    const picks = s.chosen != null ? [...s.picks, s.chosen] : s.picks;
    if (s.drawn >= s.deck.length) return setS({ ...s, picks, chosen: null, over: true });
    setS({
      ...s,
      drawn: s.drawn + 1,
      round: { text: s.deck[s.drawn], who: whoFor(s.mode), reader: (s.round.reader + 1) % players.length },
      chosen: null,
      picks,
    });
  };

  if (s.over) {
    return (
      <div className="bd vt">
        <Finished game={game} />
        <div className="bd-head center">
          <span className="kicker">{t('Game over')}</span>
          <h2 className="bd-title big">{t('All cards played!')}</h2>
        </div>
        {Summary && <Summary picks={s.picks} />}
        <div className="sticky-action stack">
          <BigButton onClick={() => setS(deal(s.mode))}>{t('Play again')}</BigButton>
          <BigButton variant="glass" onClick={exit}>
            {t('Back to games')}
          </BigButton>
        </div>
      </div>
    );
  }

  const ready = !Choice || s.chosen != null;
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
      <div className="vt-stage">
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
      <div className="vt-next">
        <BigButton size="xl" variant={ready ? 'primary' : 'glass'} disabled={!ready} onClick={next}>
          {s.drawn >= s.deck.length ? t('Finish game') : t('Next')}
        </BigButton>
      </div>
    </div>
  );
}
