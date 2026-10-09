# Parkside Activities

[![CI](https://github.com/cressie176/parkside-activities/actions/workflows/ci.yml/badge.svg)](https://github.com/cressie176/parkside-activities/actions/workflows/ci.yml)

Internal dashboard for the activities team at Parkside. Guests book onto sessions —
archery, aqua fit, kids' club, evening shows and the rest — and this shows the team how
those sessions are filling up and where the pressure is.

## Running it

```
npm install
npm run seed
npm run dev
```

`npm run seed` creates `parkside.db` and fills it with data. `npm run dev` starts the API
on port 3001 and the dashboard on http://localhost:5173.

## Layout

- `server/` — Express API. `reporting.ts` holds the aggregation logic; the routes in
  `index.ts` just call into it.
- `src/` — the React dashboard.
- `db/seed.ts` — schema and seed data.
- The backlog is in this repo's GitHub Issues.
