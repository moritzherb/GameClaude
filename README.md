# 🍻 PROST! – Drinking Games

A party & pregame drinking games app. Gig-poster look (condensed caps, games as numbered tickets, lime and yellow on warm black or paper), but still **drunk-proof**: huge buttons, one obvious action per screen,
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

### Website (GitHub Pages)

Every push to `main` builds the app and publishes it to **https://moritzherb.github.io/GameClaude/**
(`.github/workflows/deploy.yml`). One-time setup in the repo: *Settings → Pages → Build and deployment →
Source: GitHub Actions*. Pull requests run the tests and the build (`.github/workflows/ci.yml`).

## Play together (phones connected)

One phone hosts a room and shows a 4-letter code and a QR code; the others scan it or type the code.
Phones talk directly to each other over WebRTC ([PeerJS](https://peerjs.com)); the free public PeerJS server
only helps them find each other. The host phone is in charge: guests send to the host, the host sends to
one or all guests (`src/net/RoomProvider.tsx`, `useRoom()`).

- Guests that drop out (phone locked, Wi-Fi switch) reconnect automatically; a reloaded tab rejoins its room.
- Games can use `sendToHost`, `broadcast`, `sendTo(memberId)` and `onGame` to send moves and private data
  (like each player's own cards).
- A game for every phone sets `online` instead of `component` in its `GameDefinition`. The host starts it
  from the room (`room.startGame(id)`) and every phone opens it. See `hose-runter/` for the pattern: the host
  keeps the real state and sends each phone only its own view.

To test locally without internet, run your own PeerJS server and build against it:

```bash
VITE_PEER_HOST=127.0.0.1 VITE_PEER_PORT=9000 VITE_PEER_PATH=/myapp VITE_PEER_SECURE=false npm run build
```

## How it's organised

```
src/
  App.tsx              routes (#/, #/games, #/games/:id, #/play/:id, #/players, #/settings)
  state/AppState.tsx   players + settings, saved in localStorage
  lib/                 fx (sound, vibration, confetti), router, wake lock, random + card deck helpers
  net/                 play together: rooms, phone-to-phone connection, protocol
  components/          BigButton, TopBar, Sheet, GameCard, Logo, … (the drunk-proof UI kit)
  screens/             Home, Library, GameDetail, Play (game shell), Players, Settings, AgeGate, Room
  games/
    types.ts           GameDefinition + categories
    registry.ts        list of all games
    bus-driver/        Bus Driver (part 1: collect cards, part 2: pyramid + tiebreaker, part 3: the bus ride)
    kings-cup/         Kings Cup (rules per card live in rules.ts)
    hose-runter/       Hose runter (every phone plays: logic.ts = rules, HoseRunter.tsx = host + player screens)
    who-drinks/        example game
```

## Adding a game

1. Create `src/games/<game-id>/` with a component that takes `GameProps` (`players`, `exit`).
2. Export a `GameDefinition` from its `index.ts` (name, emoji, card gradient like `var(--g-sunset)`, categories, player count, intensity, rules, component).
3. Add it to `GAMES` in `src/games/registry.ts`.

The library, detail page, rules sheet, player checks and "random game" pick it up automatically.
Leave out `component` to list a game as **coming soon**.

Drink responsibly. 💧
