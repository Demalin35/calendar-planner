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

Hostinger **does not** expose a free-text install/build command. It runs `npm ci` automatically, then runs a **Build script** chosen from your `package.json` scripts.

| Setting | Value |
|---------|--------|
| **Framework preset** | `Express` (or `Other`) |
| **Root directory** | `./` (repository root) |
| **Node.js version** | `20` or `22` |
| **Package manager** | `npm` |
| **Build script** | `build` |
| **Output directory** | leave empty or `dist` (Express uses the entry file, not static output) |
| **Entry file** | `server-dist/index.js` |

Do **not** set root directory to `server/`.

**`tsc: command not found` fix:** Hostinger sets `NODE_ENV=production` during install, so plain `npm ci` skips devDependencies. This repo’s `.npmrc` sets `production=false` so `typescript` and `vite` are installed during the build. Push the latest commit before redeploying.

## Environment variables (Hostinger panel)

Add these in the Node.js Web App environment settings:

| Name | Required | Example |
|------|----------|---------|
| `NODE_ENV` | yes | `production` |
| `OPENAI_API_KEY` | yes | your secret key |
| `OPENAI_MODEL` | recommended | `gpt-4.1-mini` |
| `WORK_DAY_START` | optional | `09:00` |
| `WORK_DAY_END` | optional | `18:00` |
| `VAPID_PUBLIC_KEY` | yes (for reminders push) | from `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | yes (for reminders push) | from `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | recommended | `mailto:you@example.com` |
| `REMINDERS_DATA_PATH` | **strongly recommended** | `/home/.../persistent/reminders.json` |

Hostinger provides `PORT` automatically — you usually do **not** set it.

### Reminder notifications on Hostinger

Without `REMINDERS_DATA_PATH`, reminder data and push subscriptions are stored inside the deploy folder and **can be wiped on redeploy**. The app may still show “notifications allowed” on your phone, but the server will have nothing to send to.

1. Generate VAPID keys locally: `npx web-push generate-vapid-keys`
2. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to Hostinger env vars
3. Set `REMINDERS_DATA_PATH` to a **persistent path outside** the deploy directory (Hostinger file manager or a mounted data folder)
4. Redeploy, then open Reminders from the **Home Screen PWA** and tap **Register for notifications** if prompted
5. Confirm `/api/health` returns `"pushConfigured": true`

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
7. Set **Build script** to `build` and **Entry file** to `server-dist/index.js`.  
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
{
  "ok": true,
  "aiConfigured": true,
  "pushConfigured": true,
  "pwaAssets": {
    "manifest": true,
    "serviceWorker": true,
    "icons": true
  }
}
```

If `pwaAssets` is missing or any value is `false`, the frontend build did not deploy correctly. Reminder push and iPhone Home Screen installation will not work until all three are `true`.

Also verify the manifest directly:

```text
https://YOUR-DOMAIN.com/manifest.webmanifest
```

You must see JSON (`"display":"standalone"`), **not** the React HTML page.

## iPhone Home Screen PWA (important)

Calendar Planner must be opened from a **Home Screen icon**, not from a Safari tab. If Safari’s URL bar or bottom toolbar is visible, you are still in the browser.

### Install correctly

1. Open your **canonical Hostinger URL** in Safari (the exact domain you will keep using).
2. Reload the page once (pull to refresh).
3. Share → **Add to Home Screen** → Add.
4. Close Safari completely.
5. Launch **Calendar Planner** from the new Home Screen icon.

### After changing PWA settings or domain

**Delete the old Home Screen icon and add it again.** iOS keeps launch metadata from the original installation. An icon created before the manifest/service worker was correct will keep opening Safari.

### Hostinger domain rules

- Install from the **same HTTPS hostname** the app will use (temporary `*.onhostinger.site` or your custom domain — not both).
- Do **not** install from `public_html` static hosting if the Node.js app serves the live site. Use only the Node.js Web App URL.
- Avoid redirects between hostnames (for example `www` ↔ non-`www`, or temporary domain ↔ custom domain). If the Home Screen `start_url` redirects to another hostname, iOS opens Safari instead of standalone mode.
- In Hostinger, attach **one canonical domain** to the Node.js Web App. Pick either the temporary domain **or** your custom domain for installation, not both.

### Verify before installing on iPhone

In Safari on the phone, open:

```text
https://YOUR-DOMAIN.com/manifest.webmanifest
```

Confirm JSON is returned. Then open Reminders only after launching from the Home Screen icon (no URL bar).

## Domain

Point your domain/subdomain to the Node.js Web App in Hostinger (not only to a static `public_html` folder). The Node process serves both the UI and `/api`.

## Redeploy

1. Push changes to GitHub.  
2. Trigger redeploy / rebuild in Hostinger.  
3. Confirm `/api/health` and the homepage.  

## Rollback / troubleshooting

| Problem | What to check |
|---------|----------------|
| Build fails / `tsc: command not found` | Pull latest repo (`.npmrc` has `production=false`); confirm **Build script** = `build` |
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
