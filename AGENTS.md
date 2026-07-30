# AGENTS.md — orderManager

## Stack
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v3 (shadcn/ui), React Router v7
- **Backend:** Hono + tRPC v11 (monolith, same process)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **i18n:** Custom lightweight (zh/en), `src/i18n/`
- **Role/ability:** Client-side only, stored in memory via `useRole` hook — no real auth

## Commands
| Command | Action |
|---|---|
| `npm run dev` | Start Vite dev server (auto-proxies API via `@hono/vite-dev-server`) |
| `npm run build` | Vite build frontend → `dist/public/`, esbuild bundles API → `dist/boot.js` |
| `npm run start` | Production: `NODE_ENV=production node dist/boot.js` |
| `npm run check` | `tsc -b` (project references) — runs typecheck across all tsconfigs |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Vitest — only `api/**/*.test.ts` / `*.spec.ts` (node environment) |
| `npm run db:push` | Drizzle Kit — push schema to DB (bypasses migration files) |

## Key structure
- `src/` — Frontend (pages, components, hooks, providers, i18n)
- `api/` — Server (boot.ts entry, router.ts tRPC routes, queries/)
- `db/` — Drizzle schema, relations
- `contracts/` — Shared types (frontend & backend import these)
- `data/` — Optional pre-seeded SQLite database for demo

## Path aliases
`@/` → `src/`, `@contracts/` → `contracts/`, `@db/` → `db/`

## Important quirks
1. **Database auto-creates on first run.** `api/queries/connection.ts` has embedded DDL — no migration needed for a fresh start. DB at `./data/app.db` by default, overridable via `SQLITE_PATH` env.
2. **better-sqlite3 is a native module** — loaded via `createRequire` to avoid esbuild bundling it. The build banner (`esbuild api/boot.ts --banner:js=...`) injects `createRequire` for the production bundle.
3. **`.env.example` mentions MySQL `DATABASE_URL`** but the actual implementation uses SQLite. The env vars `APP_ID` / `APP_SECRET` are defined but unused (no auth implemented).
4. **Frontend runs via Vite dev-server plugin** in dev (`@hono/vite-dev-server`). API routes are under `/api/trpc/*`.
5. **tRPC client uses `httpBatchLink`** with `superjson` transformer and `credentials: "include"`.
6. **`db/relations.ts` is empty** — no Drizzle relations defined yet.
7. **提单页去重规则：同一图片只能创建一条明细。** 画廊卡片点击已添加的图片 → 进入灯箱预览（不可再添加）。大图选品轮播中已添加的图片显示"已添加"，默认模式不可点击，选择模式不可勾选。
