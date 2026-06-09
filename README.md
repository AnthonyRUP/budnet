# budnet

A Slack/Discord-style team messaging app built as a Turborepo monorepo. Private workspaces with shareable invite links, real-time messaging via Socket.io, and a magic-link auth flow with no passwords.

## Status

Active development — core messaging works (auth, workspaces, channels, real-time messages). See [roadmap](#roadmap) for what's coming.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Web | React + Vite + Tailwind CSS |
| Desktop | Electron (shells web app) |
| Mobile | Expo (React Native) + NativeWind |
| API | tRPC v11 — end-to-end type safety |
| Real-time | Socket.io |
| Backend | Node.js + Fastify |
| Auth | Better Auth — magic link (no passwords) |
| Database | PostgreSQL via Drizzle ORM |
| State | Zustand + TanStack Query |

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 — `npm install -g pnpm`
- **PostgreSQL** >= 14 running locally

> Redis is listed in `.env.example` for future pub-sub support but is not yet required to run the app.

## Local development setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/budnet.git
cd budnet
pnpm install
```

### 2. Create the database

```bash
createdb budnet
```

If `createdb` is not in your PATH, use `psql`:

```sql
psql -U postgres -c "CREATE DATABASE budnet;"
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in the required values:

```env
DATABASE_URL=postgresql://localhost:5432/budnet
PORT=3001
CORS_ORIGIN=http://localhost:5173
WEB_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3001

# Generate a random secret — e.g. openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here

# Only needed in production. In dev, magic links are printed to the server console.
RESEND_API_KEY=
```

### 4. Push the database schema

```bash
pnpm --filter @budnet/server exec drizzle-kit push
```

This creates all tables in the `budnet` database. Re-run this whenever the schema changes.

### 5. Run the development servers

You need two terminals running in parallel:

```bash
# Terminal 1 — backend (Fastify + tRPC + Socket.io)
pnpm dev:server

# Terminal 2 — web frontend (Vite)
pnpm dev:web
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Magic link in dev mode

There is no email sending in development. When you enter your email on the login screen, the magic link URL is printed directly to the **server terminal**. Copy it and open it in your browser to complete sign-in.

```
🔗 Magic link for you@example.com:
http://localhost:3001/api/auth/magic-link/verify?token=...&callbackURL=http://localhost:5173/app
```

### 6. (Optional) Run desktop or mobile

```bash
# Electron desktop — wraps the web app, start dev:web first
pnpm dev:desktop

# Expo mobile
pnpm dev:mobile
```

## Monorepo structure

```
apps/
  web/        Vite + React (browser)
  desktop/    Electron
  mobile/     Expo (React Native)

packages/
  api/        tRPC client + AppRouter type
  store/      Zustand stores (auth, workspace, presence)
  types/      Shared TypeScript interfaces
  ui/         Platform-aware components (web + native)
  config/     Shared ESLint, TypeScript, Tailwind configs

server/       Fastify + tRPC + Socket.io + Drizzle
```

## Available scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:server` | Start backend server |
| `pnpm dev:web` | Start web frontend |
| `pnpm dev:desktop` | Start Electron desktop app |
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm lint` | Lint all packages |

## Roadmap

- [x] Magic link auth (no passwords)
- [x] Workspaces with auto-setup
- [x] Public channels
- [x] Real-time messaging via Socket.io
- [ ] Sign out
- [ ] Create / manage channels
- [ ] Direct messages (1:1 and group)
- [ ] Invite links
- [ ] Edit / delete messages
- [ ] Emoji reactions
- [ ] Message threads
- [ ] File and image uploads
- [ ] @mention notifications
- [ ] Full-text message search
- [ ] User profiles and avatars
- [ ] Presence indicators
- [ ] Mobile (iOS / Android) parity
- [ ] Desktop (Electron) parity

## Contributing

PRs welcome. Open an issue first for larger changes.

## License

MIT
