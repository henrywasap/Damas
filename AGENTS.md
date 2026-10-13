# AGENTS.md

## Project Architecture Overview

This project is an online checkers (damas) application built with React 19, TypeScript, Vite, Tailwind CSS v4, Netlify Functions, and Netlify Database (PostgreSQL with Drizzle ORM).

### Key Architectural Layers

1. **Frontend (`src/`)**:
   - `src/App.tsx`: Central coordinator managing active view (`lobby`, `game`, `stats`), room state, bot turns, audio controls, and modal visibility.
   - `src/components/Board.tsx`: 8x8 interactive board rendering dark and light squares, piece graphics with SVG gradients (tulip & pisces motifs), move highlights, drag/click interactions, and piece counters.
   - `src/components/Lobby.tsx`: Entry screen allowing players to enter their name and choose between:
     - Online Multiplayer (create/join room, share room link, view live active rooms)
     - Solo vs AI Bot (choose difficulty: Easy, Medium, Hard/Minimax, choose color: Red or Black)
     - Local Pass & Play (two players taking turns on the same device)
   - `src/components/ScoreBoard.tsx`: Displays active room details, turn status, head-to-head score, surrender/draw/rematch controls, and share link.
   - `src/components/StatsView.tsx`: Displays leaderboard, match history, and head-to-head comparisons.
   - `src/components/InGameChat.tsx`: Real-time chat box for online multiplayer matches.
   - `src/components/RulesModal.tsx`: Comprehensive rules and mechanics explainer modal.
   - `src/hooks/useCheckersSocket.ts`: Hybrid networking hook. Connects via WebSocket if available (standalone local server) or falls back seamlessly to Netlify Functions HTTP API with smart polling (800ms in active rooms, 3000ms in lobby).
   - `src/utils/checkersLogic.ts`: Pure, deterministic checkers game rules engine:
     - Board generation (`createInitialBoard`)
     - Move generation (`getAllLegalMovesForPlayer`, `getValidMovesForSelectedPiece`)
     - Move execution (`applyMove`) with king promotion and multi-jump chain capture detection
     - Game end checking (`checkGameStatus`) detecting piece extinction, single-piece endings, and stalemate/blocks.
   - `src/utils/aiBot.ts`: Automated bot opponent with three difficulty tiers (Random/Basic captures, Heuristic Positional evaluation, and 3-ply Minimax with Alpha-Beta pruning).
   - `src/utils/soundEffects.ts`: Web Audio API synthetic sound generator for moves, captures, crowns, turn alerts, and victory sounds.

2. **Backend Serverless API (`netlify/functions/`)**:
   - `netlify/functions/api.mts`: Unified router handling `/api/*` endpoints:
     - `GET /api/health`: Health status.
     - `GET /api/stats`: Leaderboard and recent matches queried from PostgreSQL (seeds starter records if database is empty).
     - `GET /api/rooms`: List of active rooms and player counts.
     - `POST /api/rooms/join`: Room creation and player slot assignment (`red`, `black`, `spectator`).
     - `GET /api/rooms/:id`: State polling with version tracking (`?version=X`) to minimize response payload when unchanged.
     - `POST /api/rooms/:id/action`: Action processor for moves, chain jump ending, chat, draw offers, surrenders, and rematches. Applies checkers logic and automatically records match outcomes and updates player stats upon game completion. Includes in-memory fallback for local preview resilience.

3. **Database Layer (`db/`)**:
   - `db/schema.ts`: Drizzle ORM schema for PostgreSQL:
     - `players`: Track player stats (games played, wins, losses, draws, win rate, streaks, last active).
     - `matches`: Persisted match history records (room, players, winner, reason, move count, duration, timestamp).
     - `gameRooms`: Active online room states and version numbers.
   - `db/index.ts`: Database client initialization using `drizzle-orm/netlify-db`.
   - `drizzle.config.ts`: Drizzle Kit configuration targeting `netlify/database/migrations`.
   - `netlify/database/migrations/`: Generated SQL migrations applied automatically by the Netlify deployment pipeline.

## Conventions & Non-Obvious Decisions

- **Hybrid Communication**: Rather than strictly depending on persistent WebSockets (which are unavailable on standard serverless architectures), `useCheckersSocket` transparently switches between WebSockets (for standalone dev) and high-frequency HTTP polling with conditional version checks on Netlify Functions.
- **Rules Flexibility**: Captures are allowed both as jumps and simple moves when permitted by the rules set, providing tactical depth while enforcing chain captures when jumping is in progress.
- **Safe Fallback**: `netlify/functions/api.mts` maintains an in-memory buffer alongside Postgres operations to ensure uninterrupted service even during cold boots or database initialization periods.
- **No Direct Build Commands**: Production builds and database migrations are handled by the Netlify platform; manual builds that could generate repository artifacts are avoided.
