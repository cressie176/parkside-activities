# Parkside Activities

Internal dashboard for the Parkside activities team: guests book onto sessions (archery, aqua fit,
evening shows…) and the dashboard shows how sessions are filling up. Express + better-sqlite3 API,
React + Vite front end, TypeScript throughout. Node is pinned via `.nvmrc` (24).

## Layout
- `server/reporting.ts`: all aggregation logic (unit tested in `server/reporting.test.ts`, `:memory:` DB).
- `server/index.ts`: thin Express routes that call into `reporting.ts`. `server/db.ts` opens the DB.
- `src/App.tsx`, `src/components/*`: React dashboard. `db/seed.ts`: schema and seed data.

## Commands
- `npm ci`: install. `npm run seed`: (re)create and fill the SQLite DB.
- `npm run dev`: API (default 3001) and dashboard (default 5173, proxies `/api`).
- `npm run check`: typecheck, tests, build. Must pass before every commit.
- `npm run lint:fix`: Biome lint and format (arriving with #14).
- Git hooks via Lefthook (arriving with #15); CI runs the checks on every PR (#16).

Env vars (all optional, see `.env.example`): `API_PORT`, `WEB_PORT`, `DB_PATH` (relative to repo root).

## Domain glossary
- **session**: one scheduled run of an activity; has `capacity` in **places**.
- **booking**: one guest's reservation on a session; `party_size` = number of **places** it takes.
- **status**: `confirmed` | `cancelled`. Cancelled bookings must not consume places.
- Booking count ≠ places. Count places (sum of `party_size`) when talking about capacity.

## Worktree recipe (parallel work)
```
git worktree add ../parkside-<issue> -b <branch>
cd ../parkside-<issue> && npm ci && npm run seed
API_PORT=31<nn> WEB_PORT=51<nn> npm run dev   # <nn> = issue number, e.g. 3117/5117 for #17
```
Each worktree gets its own `parkside.db`, so seeds don't collide.

## Workflow rules
- Discuss the issue with the user before starting. One branch per issue.
- TDD for changes to `reporting.ts`: write the failing test first.
- Run `npm run check` before every commit. Never use `--no-verify`.
- Push and open a PR whose body contains `Closes #N`, and summarise any deviations from the issue.
