import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import DeckCount from '../../components/DeckCount';
import PlayingCard from '../../components/PlayingCard';
import Suit from '../../components/Suit';
import Tap from '../../components/Tap';
import { t } from '../../i18n';
import { cardColor, cardName, rankLabel, SUITS, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { useApp } from '../../state/AppState';
import type { GameProps } from '../types';
import { direction, guess, MISSES_TO_PASS, newGame, next, nextGuesser, possible, takeOver, VALUES, type Game } from './logic';

/** The flipped card stays on the deck this long before it flies into the middle. */
const LAND_MS = 1100;

export default function FuckTheDealer({ players, exit }: GameProps) {
  const known = useApp().knows('fuck-the-dealer');
  const [dealerId, setDealerId] = useState(() => pick(players).id);
  const [g, setG] = useState<Game | null>(null);
  // The resolved card sits face up on the deck until it lands on its pile.
  const [landed, setLanded] = useState(true);
  const [flight, setFlight] = useState<{ value: number; from: DOMRect; key: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const deckCard = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* ---------- Setup: who deals first ---------- */
  if (!g) {
    return (
      <div className="bd">
        <div className="bd-head">
          <h2 className="bd-title">{t('Who’s the dealer?')}</h2>
          {!known && (
            <p className="lead">{t('The dealer holds the deck and peeks at the top card. Everyone else guesses, starting on the dealer’s left.')}</p>
          )}
        </div>
        <div className="pick-grid">
          {players.map((p) => (
            <Tap
              key={p.id}
              className={`pick-chip${p.id === dealerId ? ' selected' : ''}`}
              style={{ '--chip': p.color } as CSSProperties}
              onClick={() => setDealerId(p.id)}
            >
              <span className="pick-chip-avatar">{p.avatar}</span>
              <span className="pick-chip-name">{p.name}</span>
              {/* The same word in German for this game. */}
              {p.id === dealerId && <span className="pick-chip-badge">Dealer</span>}
            </Tap>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={() => setDealerId(pick(players).id)}>
          {t('Random dealer')}
        </button>
        <div className="sticky-action">
          <BigButton
            size="xl"
            onClick={() => {
              setLanded(true);
              setG(newGame(players.length, Math.max(0, players.findIndex((p) => p.id === dealerId))));
            }}
          >
            {t('Let’s go')}
          </BigButton>
        </div>
      </div>
    );
  }

  const dealer = players[g.dealer];

  /* ---------- The deck moves on, or it's empty: the dealer drinks what they saved ---------- */
  if (g.handover) {
    const from = players[g.handover.dealer];
    const sips = g.handover.sips;
    return (
      <div className="bd ftd-handover">
        <div className="bd-head center">
          <span className="kicker">{g.over ? t('Deck’s empty!') : t('Dealer change')}</span>
          <span className="bd-avatar xl" style={{ background: from.color }}>
            {from.avatar}
          </span>
          <h2 className="bd-title big">{sips ? t('{name} drinks up', { name: from.name }) : t('{name} gets away', { name: from.name })}</h2>
          <div className={`ftd-sips${sips ? '' : ' none'}`}>
            <span className="ftd-sips-num">{sips}</span>
            <span className="ftd-sips-label">{sips === 1 ? t('sip') : t('sips')}</span>
          </div>
          <p className="lead">{sips ? t('Everything saved up as dealer, all at once.') : t('Not a single sip saved up. Lucky.')}</p>
        </div>

        {g.over ? (
          <>
            <section className="panel">
              <h3 className="section-title">{t('Drunk as dealer')}</h3>
              <div className="ftd-tally">
                {players
                  .map((p, i) => ({ p, n: g.drank[i] }))
                  .sort((a, b) => b.n - a.n)
                  .map(({ p, n }) => (
                    <div key={p.id} className="ftd-tally-row">
                      <span className="bd-avatar xs" style={{ background: p.color }}>
                        {p.avatar}
                      </span>
                      <span className="ftd-tally-name">{p.name}</span>
                      <span className="ftd-tally-num">{n === 1 ? t('1 sip') : t('{n} sips', { n })}</span>
                    </div>
                  ))}
              </div>
            </section>
            <div className="sticky-action stack">
              <BigButton onClick={() => setG(null)}>{t('Play again')}</BigButton>
              <BigButton variant="glass" onClick={exit}>
                {t('Back to games')}
              </BigButton>
            </div>
          </>
        ) : (
          <>
            <div className="ftd-next-dealer">
              <span className="kicker">{t('New dealer')}</span>
              <span className="bd-player">
                <span className="bd-avatar sm" style={{ background: dealer.color }}>
                  {dealer.avatar}
                </span>
                <span className="bd-player-name">{dealer.name}</span>
              </span>
            </div>
            <div className="sticky-action">
              <BigButton size="xl" onClick={() => setG(takeOver(g))}>
                {t('{name} takes the deck', { name: dealer.name })}
              </BigButton>
            </div>
          </>
        )}
      </div>
    );
  }

  const guesser = players[g.guesser];
  const r = g.result;
  const dir = g.firstGuess != null && g.deck.length ? direction(g.firstGuess, g.deck[0].value) : null;
  const out = 52 - g.deck.length;
  // The card on the deck: the resolved one until it has flown into the middle, then the next one face down.
  const shown: Card | undefined = r && !landed ? r.card : g.deck[0];

  const onGuess = (value: number) => {
    if (r) return;
    const after = guess(g, value);
    setG(after);
    setPeek(false);
    if (!after.result) {
      sfx.tick();
      buzz(20);
      return;
    }
    setLanded(false);
    const res = after.result;
    timer.current = window.setTimeout(() => {
      if (res.outcome === 'first') celebrate();
      else if (res.outcome === 'second') {
        sfx.pop();
        buzz([30, 40, 30]);
      } else {
        sfx.boo();
        buzz([60, 40, 120]);
      }
      timer.current = window.setTimeout(() => {
        const from = deckCard.current?.getBoundingClientRect();
        if (from) setFlight({ value: res.card.value, from, key: out });
        setLanded(true);
      }, LAND_MS - 450);
    }, 450);
  };

  const onNext = () => {
    window.clearTimeout(timer.current);
    setLanded(true);
    sfx.pop();
    buzz();
    setG(next(g, players.length));
  };

  const lastOfThree = r?.outcome === 'miss' && g.misses >= MISSES_TO_PASS;

  return (
    <div className="ftd">
      <div className="kc-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: dealer.color }}>
            {dealer.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{dealer.name}</span>
            <span className="bd-player-sub">
              {g.saved === 1 ? t('Dealer · 1 sip saved') : t('Dealer · {n} sips saved', { n: g.saved })}
            </span>
          </span>
        </div>
        <DeckCount left={g.deck.length + (r && !landed ? 1 : 0)} />
      </div>

      <Table g={g} hide={r && !landed ? r.card : null} flight={flight} />

      <div className="ftd-turn">
        <div
          ref={deckCard}
          className={`ftd-deck${g.deck.length > 1 || (r && !landed) ? ' stacked' : ''}`}
          onPointerDown={() => !r && setPeek(true)}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
          onPointerCancel={() => setPeek(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {shown ? (
            <PlayingCard key={r && !landed ? out - 1 : out} card={shown} faceUp={peek || (!!r && !landed)} size="lg" />
          ) : (
            <span className="ftd-deck-empty" />
          )}
          {/* Kept in place (just hidden) once the card is out, so nothing jumps. */}
          {!known && <span className={`ftd-peek-hint${r ? ' off' : ''}`}>{t('Dealer: hold to peek')}</span>}
        </div>

        <div className="ftd-ask">
          <span className="ftd-guesser">
            <span className="bd-avatar xs" style={{ background: guesser.color }}>
              {guesser.avatar}
            </span>
            <span className="ftd-guesser-name">{guesser.name}</span>
          </span>
          <h2 className={`ftd-question${dir ? ' hint' : ''}`}>
            {dir === 'higher' ? t('It’s higher ⬆') : dir === 'lower' ? t('It’s lower ⬇') : t('Which card?')}
          </h2>
          <p className="ftd-ask-sub">
            {g.firstGuess != null && !r
              ? t('Your guess: {rank}. Last try!', { rank: rankLabel(g.firstGuess) })
              : !known && !r
                ? t('Guess the value, the suit doesn’t matter.')
                : null}
          </p>
          <Misses n={g.misses} />
        </div>
      </div>

      {!r ? (
        <div className="ftd-pad">
          {VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`ftd-rank${v === g.firstGuess ? ' crossed' : ''}`}
              disabled={!possible(g, v)}
              onClick={() => onGuess(v)}
            >
              {rankLabel(v)}
            </button>
          ))}
        </div>
      ) : (
        <Verdict result={r} dealer={dealer.name} lastOfThree={lastOfThree} />
      )}

      {r && (
        <div className="sticky-action">
          <BigButton size="xl" variant={lastOfThree || !g.deck.length ? 'primary' : 'light'} onClick={onNext}>
            {!g.deck.length
              ? t('Finish game')
              : lastOfThree
                ? t('Pass the deck →')
                : t('Next: {name} →', { name: players[nextGuesser(g.guesser, g.dealer, players.length)].name })}
          </BigButton>
        </div>
      )}
    </div>
  );
}

function Verdict({ result, dealer, lastOfThree }: { result: NonNullable<Game['result']>; dealer: string; lastOfThree: boolean }) {
  const card = cardName(result.card);
  const [tone, emoji, title, sub] =
    result.outcome === 'first'
      ? ['correct', '🎯', t('Bullseye!'), t('{name} saves 6 sips.', { name: dealer })]
      : result.outcome === 'second'
        ? ['same', '👌', t('Got it!'), t('{name} saves 3 sips.', { name: dealer })]
        : ['wrong', '🙅', t('Missed!'), lastOfThree ? t('Third miss in a row: the deck moves on.') : t('Nobody drinks.')];
  return (
    <div className={`bd-result ${tone}`}>
      <span className="bd-result-emoji">{emoji}</span>
      <span className="bd-result-text">
        <span className="bd-result-title">{title}</span>
        <span className="bd-result-sub">{sub}</span>
        <span className="bd-result-card">{t('It was {card}', { card })}</span>
      </span>
    </div>
  );
}

/** Misses in a row, out of three: the third one moves the deck on. */
function Misses({ n }: { n: number }) {
  return (
    <span className="ftd-misses" aria-label={t('{n} of 3 misses in a row', { n })}>
      {Array.from({ length: MISSES_TO_PASS }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
      <span className="ftd-misses-label">{t('misses in a row')}</span>
    </span>
  );
}

/** A small number from a card, stable across renders, so every card keeps its messy spot on its pile. */
function wobble(card: Card, salt: number) {
  const h = Math.imul(card.value * 97 + SUITS.indexOf(card.suit) * 31 + salt * 7919, 2654435761) >>> 0;
  return (h % 1000) / 1000 - 0.5;
}

/**
 * The middle of the table: one pile per value from 2 to Ace, a little messy like real cards.
 * Once all four of a value are out, the pile is turned over.
 */
function Table({ g, hide, flight }: { g: Game; hide: Card | null; flight: { value: number; from: DOMRect; key: number } | null }) {
  const piles = useRef<Record<number, HTMLDivElement | null>>({});
  // The card flies from the deck onto its pile (measured, then animated back from where it came).
  useLayoutEffect(() => {
    if (!flight || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const top = piles.current[flight.value]?.querySelector<HTMLElement>('.ftd-card:last-of-type');
    if (!top) return;
    const to = top.getBoundingClientRect();
    const dx = flight.from.left + flight.from.width / 2 - (to.left + to.width / 2);
    const dy = flight.from.top + flight.from.height / 2 - (to.top + to.height / 2);
    top.animate([{ translate: `${dx}px ${dy}px`, scale: `${flight.from.width / to.width}`, zIndex: 5 }, { translate: '0 0', scale: '1', zIndex: 5 }], {
      duration: 520,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }, [flight]);

  return (
    <div className="ftd-table">
      {VALUES.map((v, i) => {
        const pile = g.piles[i].filter((c) => c !== hide);
        const full = pile.length === 4;
        return (
          <div key={v} className="ftd-pile" ref={(el) => void (piles.current[v] = el)}>
            <div className="ftd-pile-cards">
              {pile.length === 0 && <span className="ftd-pile-empty">{rankLabel(v)}</span>}
              {pile.map((c, j) => (
                <span
                  key={`${c.value}${c.suit}`}
                  className={`ftd-card ${full && j === 3 ? 'back' : cardColor(c)}`}
                  style={
                    {
                      '--rot': `${wobble(c, 1) * 16}deg`,
                      '--dx': `${wobble(c, 2) * 8 - j * 1.5}%`,
                      '--dy': `${wobble(c, 3) * 6 - j * 4}%`,
                    } as CSSProperties
                  }
                >
                  {!(full && j === 3) && (
                    <>
                      <span className="ftd-card-rank">{rankLabel(c.value)}</span>
                      <Suit suit={c.suit} className="ftd-card-suit" />
                    </>
                  )}
                </span>
              ))}
            </div>
            <span className="ftd-pile-count" aria-label={t('{n} of 4 out', { n: pile.length })}>
              {[0, 1, 2, 3].map((k) => (
                <i key={k} className={k < pile.length ? 'on' : ''} />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
