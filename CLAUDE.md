# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

The app source is in the `omniscience/` subdirectory. All commands run from there:

```bash
cd omniscience
yarn                # install dependencies
yarn start          # start Expo dev server
yarn android        # run on Android
yarn ios            # run on iOS
yarn web            # run on web (limited by CORS)
yarn test           # run Jest tests
```

To run a single test by name: `yarn test -t "test name"`

CI runs `yarn install` then `yarn test` via GitHub Actions (`.github/workflows/build.yml`).

## Architecture

Omniscience is a React Native / Expo (SDK 53) app that predicts Magic: The Gathering tournament top-8 odds using Monte Carlo simulation. It authenticates against the Wizards Companion backend and pulls live tournament data via GraphQL.

### Navigation Flow
`LoginScreen → EventsScreen → StandingsScreen` (React Navigation native stack, defined in `App.tsx`)

### Key Files
- **`core/gamestate.tsx`** — Core business logic. Contains `Player` and `GameState` classes with JSON serialization, plus `SimulateRound()` and `SimulateEvent()` functions that run Monte Carlo simulations. This is where tiebreaker logic (Swiss format: match points → opponent match win % → game win % → opponent game win %) lives.
- **`screens/standingsscreen.tsx`** — Largest screen (~900 lines). Displays standings, runs simulations, shows top-8 odds for win/loss/draw scenarios.
- **`screens/loginscreen.tsx`** — OAuth login against Wizards platform API.
- **`screens/eventsscreen.tsx`** — Fetches and lists active events via GraphQL.
- **`test.tsx`** — All Jest tests (serialization, simulation, game state).

### State Management
No global state library. Each screen manages its own state via React hooks (`useState`/`useEffect`). Persistent data (tokens, persona ID, predictions) stored in AsyncStorage.

### API Integration
- **Auth**: OAuth to `api.platform.wizards.com` with hardcoded client credentials
- **Data**: GraphQL to `api.tabletop.wizards.com/silverbeak-griffin-service/graphql`
- Direct `fetch()` calls in screen components; no service abstraction layer

### Simulation Engine
`SimulateEvent()` in `core/gamestate.tsx` runs N iterations of remaining tournament rounds. Each iteration randomly assigns match results (with a 1% unintentional draw rate), then checks if the target player lands in top 8. Key assumptions: equal player skill, rational behavior, Swiss format with top-8 cut.
