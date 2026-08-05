# Calendar Planner

Local-first calendar and task planner (React + TypeScript + Vite + Dexie) with an optional AI planning assistant.

## Local development

```bash
# Terminal 1 — API (reads server/.env or root .env)
cp server/.env.example server/.env
# set OPENAI_API_KEY in server/.env
npm install
npm run dev:server

# Terminal 2 — UI
npm run dev
```

Vite proxies `/api` → `http://localhost:3001`.

## Production (Hostinger Node.js Web App)

See **[HOSTINGER-DEPLOY.md](./HOSTINGER-DEPLOY.md)**.

```bash
npm ci && npm run build
npm start
```

One Node process serves the React `dist/` and `/api/*` on the same domain.
