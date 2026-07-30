# Calendar Planner

Local-first calendar and task planner (React + TypeScript + Vite + Dexie).

## AI Planning Assistant

The assistant UI lives in the React app. OpenAI calls run on a small local server so the API key never enters the browser.

### 1. Configure the server

```bash
cd server
cp .env.example .env
# Edit server/.env and set OPENAI_API_KEY=...
npm install
```

### 2. Run locally

In one terminal:

```bash
npm run dev:server
```

In another:

```bash
npm run dev:client
```

Vite proxies `/api/*` to `http://localhost:3001`.

### 3. Verify

- Open the app, tap the sparkles button
- Ask: “Add gym tomorrow at 5 for one hour.”
- Approve suggestions before anything is saved to IndexedDB

Nothing is written until you tap **Approve all** or **Add selected**.
