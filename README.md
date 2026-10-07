# 🍻 PROST! – Drinking Games

A party & pregame drinking games app. Sleek dark look with gradient cards, but still **drunk-proof**: huge buttons, one obvious action per screen,
the escape button is always top-left, and the screen stays on while you play.

Runs in any phone browser and can be installed to the home screen (PWA). It also works offline once loaded.

## Run it

```bash
npm install
npm run dev       # dev server – open the "Network" URL on your phone (same Wi-Fi)
npm run build     # production build into dist/
npm run preview   # serve the production build
npm test          # game logic tests (vitest)
```

`dist/` is fully static (relative paths + hash routing), so it can be hosted anywhere: GitHub Pages, Netlify, Vercel…

## How it's organised

```
src/
  App.tsx              routes (#/, #/games, #/games/:id, #/play/:id, #/players, #/settings)
  state/AppState.tsx   players + settings, saved in localStorage
  lib/                 fx (sound, vibration, confetti), router, wake lock, random + card deck helpers
  components/          BigButton, TopBar, Sheet, GameCard, Logo, … (the drunk-proof UI kit)
  screens/             Home, Library, GameDetail, Play (game shell), Players, Settings, AgeGate
  games/
    types.ts           GameDefinition + categories
    registry.ts        list of all games
    bus-driver/        Bus Driver (part 1: collect your cards)
    kings-cup/         Kings Cup (rules per card live in rules.ts)
    who-drinks/        example game
```

## Adding a game

1. Create `src/games/<game-id>/` with a component that takes `GameProps` (`players`, `exit`).
2. Export a `GameDefinition` from its `index.ts` (name, emoji, card gradient like `var(--g-sunset)`, categories, player count, intensity, rules, component).
3. Add it to `GAMES` in `src/games/registry.ts`.

The library, detail page, rules sheet, player checks and "random game" pick it up automatically.
Leave out `component` to list a game as **coming soon**.

Drink responsibly. 💧
