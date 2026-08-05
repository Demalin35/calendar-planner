# Hostinger Node.js Web App deployment

Deploy the **entire** Calendar Planner (React UI + Express AI API) as **one** Node.js Web App on Hostinger Business Web Hosting.

Same domain:

- `https://YOUR-DOMAIN.com/` → React frontend  
- `https://YOUR-DOMAIN.com/api/...` → Express API  

## Prerequisites

- Hostinger **Business Web Hosting** (or any plan with **Node.js Web Apps**)
- GitHub repository connected to Hostinger
- OpenAI API key ([platform.openai.com](https://platform.openai.com/api-keys))
- Node.js **20 LTS** (or 22 LTS if offered)

## Exact Hostinger settings

| Setting | Value |
|---------|--------|
| **Root directory** | `/` (repository root) |
| **Node.js version** | `20` (or `22`) |
| **Build command** | `npm ci && npm run build` |
| **Start command** | `npm start` |

Do **not** set root directory to `server/`.  
Do **not** put `npm install` inside the start command.

## Environment variables (Hostinger panel)

Add these in the Node.js Web App environment settings:

| Name | Required | Example |
|------|----------|---------|
| `NODE_ENV` | yes | `production` |
| `OPENAI_API_KEY` | yes | your secret key |
| `OPENAI_MODEL` | recommended | `gpt-4.1-mini` |
| `WORK_DAY_START` | optional | `09:00` |
| `WORK_DAY_END` | optional | `18:00` |

Hostinger provides `PORT` automatically — you usually do **not** set it.

### Not required for this Hostinger setup

- `VITE_ASSISTANT_API_BASE_URL` — same-origin `/api` is used  
- `CORS_ORIGIN` — same origin, CORS not required  

## GitHub deployment steps

1. Push this repository to GitHub (`main` branch).  
2. In Hostinger hPanel → **Websites** → your site → **Node.js** / **Web Apps**.  
3. Create or configure a Node.js Web App.  
4. Connect the GitHub repository.  
5. Set **root directory** to the repository root.  
6. Select Node **20**.  
7. Paste build/start commands from the table above.  
8. Add environment variables.  
9. Deploy / rebuild.  
10. Attach your domain to the Node.js app (Hostinger domain settings).  

## Health check

After deploy, open:

```text
https://YOUR-DOMAIN.com/api/health
```

Expected:

```json
{"ok":true,"aiConfigured":true}
```

If `aiConfigured` is `false`, `OPENAI_API_KEY` is missing in Hostinger env vars.

## Domain

Point your domain/subdomain to the Node.js Web App in Hostinger (not only to a static `public_html` folder). The Node process serves both the UI and `/api`.

## Redeploy

1. Push changes to GitHub.  
2. Trigger redeploy / rebuild in Hostinger.  
3. Confirm `/api/health` and the homepage.  

## Rollback / troubleshooting

| Problem | What to check |
|---------|----------------|
| Build fails | Hostinger build logs; run `npm ci && npm run build` locally |
| App starts then exits | Runtime logs; confirm `OPENAI_API_KEY` and that `dist/index.html` was built |
| Blank page | Open browser Network tab for JS/CSS 404s; confirm `npm run build` produced `dist/` |
| `/api/health` HTML instead of JSON | Wrong start command or not running the Node app |
| AI fails | `/api/health` → `aiConfigured`; OpenAI billing/quota |
| Assistant “mock” behavior | API unreachable; check Hostinger runtime logs |

## Logs

In Hostinger hPanel for the Node.js Web App:

- **Build logs** — `npm ci` / `npm run build` output  
- **Runtime logs** — `npm start` / crash messages  

Never paste logs that contain secrets into public chats.

## Security warning

- `OPENAI_API_KEY` must live **only** in Hostinger environment variables.  
- Never commit `.env` files.  
- Never use `VITE_OPENAI_API_KEY`.  
- Rotate the key if it was ever committed or leaked.  

## Calendar data note

Events/tasks are stored in the browser (**IndexedDB via Dexie**).  
They are **not** stored on Hostinger’s server. Each device/browser has its own data. The API only receives a short snapshot with each assistant chat message.

## Local production test

```bash
# From repository root
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=...

npm ci
npm run build
npm start
```

Then open:

- http://localhost:3001/  
- http://localhost:3001/api/health  

(Use whatever `PORT` is set; default is 3001.)

## Local development (two processes)

```bash
npm run dev:server   # API on :3001
npm run dev          # Vite on :5173 with /api proxy
```
