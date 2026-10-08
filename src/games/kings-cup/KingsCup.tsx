import { useEffect, useRef, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import PlayingCard from '../../components/PlayingCard';
import { newDeck, type Card } from '../../lib/cards';
import { buzz, celebrate, sfx } from '../../lib/fx';
import { shuffle } from '../../lib/random';
import type { Player } from '../../state/AppState';
import type { GameProps } from '../types';
import { CARD_RULES, isKing, LAST_KING_RULE } from './rules';

interface State {
  deck: Card[];
  turn: number;
  /** The card just drawn by the current player (null = not drawn yet). */
  current: Card | null;
  kings: number;
  questionMasterId: string | null;
  mates: [string, string][];
  houseRules: string[];
  over: boolean;
}

const fresh = (): State => ({
  deck: shuffle(newDeck()),
  turn: 0,
  current: null,
  kings: 0,
  questionMasterId: null,
  mates: [],
  houseRules: [],
  over: false,
});

export default function KingsCup({ players, exit }: GameProps) {
  const [s, setS] = useState<State>(fresh);
  const [ruleDraft, setRuleDraft] = useState('');
  const drawing = useRef(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const player = players[s.turn % players.length];
  const byId = (id: string) => players.find((p) => p.id === id);
  const lastKing = s.current && isKing(s.current) && s.kings === 4;
  const rule = s.current ? (lastKing ? LAST_KING_RULE : CARD_RULES[s.current.value]) : null;
  const myMate = s.mates.find(([a]) => a === player.id)?.[1];

  const draw = () => {
    if (s.current || drawing.current || s.over) return;
    drawing.current = true;
    const [card, ...deck] = s.deck;
    const kings = s.kings + (isKing(card) ? 1 : 0);
    setS({
      ...s,
      deck,
      current: card,
      kings,
      questionMasterId: card.value === 12 ? player.id : s.questionMasterId,
    });
    timer.current = window.setTimeout(() => {
      if (isKing(card) && kings === 4) celebrate();
      else {
        sfx.tick();
        buzz(isKing(card) ? [40, 40, 80] : 20);
      }
    }, 450);
  };

  const next = () => {
    drawing.current = false;
    setRuleDraft('');
    // The 4th King or an empty deck ends the game.
    if (lastKing || s.deck.length === 0) return setS({ ...s, over: true });
    setS({ ...s, current: null, turn: (s.turn + 1) % players.length });
  };

  const addRule = () => {
    const text = ruleDraft.trim();
    if (!text) return;
    sfx.pop();
    buzz();
    setS({ ...s, houseRules: [...s.houseRules, text] });
    setRuleDraft('');
  };

  const pickMate = (mate: Player) =>
    setS({ ...s, mates: [...s.mates.filter(([a]) => a !== player.id), [player.id, mate.id]] });

  const effects = (
    <ActiveEffects
      questionMaster={s.questionMasterId ? byId(s.questionMasterId) : undefined}
      mates={s.mates.map(([a, b]) => [byId(a), byId(b)] as const)}
      houseRules={s.houseRules}
    />
  );

  if (s.over) {
    return (
      <div className="kc">
        <div className="bd-head">
          <span className="kicker">Game over</span>
          <h2 className="bd-title big">{s.kings === 4 ? `${player.name} drank the King’s Cup 🏆` : 'Deck’s empty!'}</h2>
          <p className="lead">{52 - s.deck.length} cards drawn.</p>
        </div>
        {effects}
        <div className="sticky-action stack">
          <BigButton onClick={() => setS(fresh())}>Play again</BigButton>
          <BigButton variant="glass" onClick={exit}>
            Back to games
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="kc">
      <div className="kc-status">
        <div className="bd-player">
          <span className="bd-avatar" style={{ background: player.color }}>
            {player.avatar}
          </span>
          <span className="bd-player-text">
            <span className="bd-player-name">{player.name}</span>
            <span className="bd-player-sub">{s.current ? 'drew a card' : 'your turn'}</span>
          </span>
        </div>
        <div className="kc-counters">
          <span className="kc-kings" aria-label={`${s.kings} of 4 kings drawn`}>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} className={n <= s.kings ? 'on' : ''}>
                👑
              </i>
            ))}
          </span>
          <span className="kc-left">{s.deck.length} cards left</span>
        </div>
      </div>

      <button type="button" className="kc-table" onClick={draw} disabled={!!s.current} aria-label="Draw a card">
        <PlayingCard key={52 - s.deck.length - (s.current ? 1 : 0)} card={s.current} faceUp={!!s.current} size="xl" waiting={!s.current} />
        {!s.current && <span className="kc-hint">Tap to draw</span>}
      </button>

      {rule && s.current ? (
        <div className={`kc-rule${lastKing ? ' finale' : ''}`}>
          <span className="kc-rule-emoji">{rule.emoji}</span>
          <span className="kc-rule-text">
            <span className="kc-rule-title">{rule.title}</span>
            <span className="kc-rule-body">{rule.text}</span>
            {s.current.value === 13 && !lastKing && (
              <span className="kc-rule-note">
                {4 - s.kings} King{4 - s.kings > 1 ? 's' : ''} left. Whoever draws the last one drinks the cup.
              </span>
            )}
            {s.current.value === 12 && <span className="kc-rule-note">{player.name} is the Question Master now.</span>}
          </span>
        </div>
      ) : (
        <p className="lead center">Draw a card and do what it says.</p>
      )}

      {s.current?.value === 8 && (
        <div className="kc-action">
          <span className="kc-action-label">Who’s your mate?</span>
          <div className="pick-grid">
            {players
              .filter((p) => p.id !== player.id)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pick-chip${myMate === p.id ? ' selected' : ''}`}
                  style={{ '--chip': p.color } as CSSProperties}
                  onClick={() => {
                    sfx.pop();
                    buzz();
                    pickMate(p);
                  }}
                >
                  <span className="pick-chip-avatar">{p.avatar}</span>
                  <span className="pick-chip-name">{p.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {s.current?.value === 11 && (
        <form
          className="kc-action"
          onSubmit={(e) => {
            e.preventDefault();
            addRule();
          }}
        >
          <label className="kc-action-label" htmlFor="kc-rule">
            Write down your rule (optional)
          </label>
          <div className="add-player">
            <input
              id="kc-rule"
              className="add-player-input"
              value={ruleDraft}
              maxLength={80}
              placeholder="e.g. No first names"
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => setRuleDraft(e.target.value)}
            />
            <button type="submit" className="add-player-btn" aria-label="Save rule" disabled={!ruleDraft.trim()}>
              ✓
            </button>
          </div>
        </form>
      )}

      {effects}

      {s.current && (
        <div className="sticky-action">
          <BigButton size="xl" variant={lastKing ? 'primary' : 'light'} onClick={next}>
            {lastKing || s.deck.length === 0 ? 'Finish game' : `Next: ${players[(s.turn + 1) % players.length].name} →`}
          </BigButton>
        </div>
      )}
    </div>
  );
}

function ActiveEffects({
  questionMaster,
  mates,
  houseRules,
}: {
  questionMaster?: Player;
  mates: (readonly [Player | undefined, Player | undefined])[];
  houseRules: string[];
}) {
  if (!questionMaster && !mates.length && !houseRules.length) return null;
  return (
    <section className="panel kc-effects">
      <h3 className="section-title">In play</h3>
      {questionMaster && (
        <div className="kc-effect">
          <span className="kc-effect-icon">❓</span>
          <span>
            <strong>{questionMaster.name}</strong> is Question Master
          </span>
        </div>
      )}
      {mates.map(([a, b], i) =>
        a && b ? (
          <div key={i} className="kc-effect">
            <span className="kc-effect-icon">🤝</span>
            <span>
              <strong>{a.name}</strong> drinks → <strong>{b.name}</strong> drinks
            </span>
          </div>
        ) : null,
      )}
      {houseRules.map((r, i) => (
        <div key={i} className="kc-effect">
          <span className="kc-effect-icon">📜</span>
          <span>{r}</span>
        </div>
      ))}
    </section>
  );
}
