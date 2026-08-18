import dotenv from 'dotenv';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlanningAssistant } from './assistant.js';
import { getDbPathForLogging, getRemindersDb } from './reminders/db.js';
import {
  completeReminder,
  deleteReminderHandler,
  getReminders,
  getPushSubscriptionStatus,
  getVapidPublicKeyHandler,
  postReminder,
  putReminder,
  subscribePush,
  unsubscribePush,
} from './reminders/routes.js';
import { startReminderScheduler } from './reminders/push.js';
import type { PlanRequestBody } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

// Load env from repo root first, then server/.env for local overrides.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MAX_MESSAGE_LENGTH = 2000;
const MAX_EVENTS = 200;
const MAX_TASKS = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireProductionConfig() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      '[startup] OPENAI_API_KEY is missing. Set it in Hostinger environment variables.',
    );
    if (isProduction) {
      process.exit(1);
    }
  }
}

requireProductionConfig();

const app = express();
const port = Number(process.env.PORT || 3001);

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many assistant requests. Please try again later.' },
});

const remindersLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reminder requests. Please try again later.' },
});

getRemindersDb();
console.log(`[reminders] database path: ${getDbPathForLogging()}`);
startReminderScheduler();

app.get('/api/health', (_req, res) => {
  let pwaAssets: {
    manifest: boolean;
    serviceWorker: boolean;
    icons: boolean;
  } | undefined;

  if (isProduction) {
    const distPath = resolveDistPath();
    pwaAssets = {
      manifest: fs.existsSync(path.join(distPath, 'manifest.webmanifest')),
      serviceWorker: fs.existsSync(path.join(distPath, 'sw.js')),
      icons: fs.existsSync(path.join(distPath, 'pwa-192x192.png')),
    };
  }

  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    pushConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    pwaAssets,
  });
});

app.post('/api/assistant/plan', assistantLimiter, async (req, res) => {
  try {
    const body = req.body as PlanRequestBody;

    if (!body?.message || typeof body.message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const message = body.message.trim();
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({
        error: `message must be at most ${MAX_MESSAGE_LENGTH} characters`,
      });
      return;
    }

    if (!body.selectedDate || typeof body.selectedDate !== 'string') {
      res.status(400).json({ error: 'selectedDate is required (yyyy-MM-dd)' });
      return;
    }
    if (!DATE_RE.test(body.selectedDate)) {
      res.status(400).json({ error: 'selectedDate must be yyyy-MM-dd' });
      return;
    }

    if (body.events && !Array.isArray(body.events)) {
      res.status(400).json({ error: 'events must be an array' });
      return;
    }
    if (body.tasks && !Array.isArray(body.tasks)) {
      res.status(400).json({ error: 'tasks must be an array' });
      return;
    }
    if ((body.events?.length ?? 0) > MAX_EVENTS) {
      res.status(400).json({ error: `events must contain at most ${MAX_EVENTS} items` });
      return;
    }
    if ((body.tasks?.length ?? 0) > MAX_TASKS) {
      res.status(400).json({ error: `tasks must contain at most ${MAX_TASKS} items` });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(503).json({ error: 'AI assistant is not configured' });
      return;
    }

    const plan = await runPlanningAssistant({
      message,
      selectedDate: body.selectedDate,
      language: body.language === 'ru' ? 'ru' : 'en',
      events: Array.isArray(body.events) ? body.events : [],
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
      conversationHistory: Array.isArray(body.conversationHistory)
        ? body.conversationHistory
        : undefined,
      pendingAction: body.pendingAction ?? undefined,
      lastExecutedActionId:
        typeof body.lastExecutedActionId === 'string'
          ? body.lastExecutedActionId
          : undefined,
    });

    res.json(plan);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Assistant request failed';
    // Never log prompts, calendar payloads, or secrets.
    console.error('[assistant] request failed');
    res.status(500).json({
      error: isProduction ? 'Assistant request failed' : message,
    });
  }
});

app.get('/api/reminders/push/vapid-public-key', remindersLimiter, getVapidPublicKeyHandler);
app.get('/api/reminders/push/status', remindersLimiter, getPushSubscriptionStatus);
app.post('/api/reminders/push/subscribe', remindersLimiter, subscribePush);
app.delete('/api/reminders/push/subscribe', remindersLimiter, unsubscribePush);
app.get('/api/reminders', remindersLimiter, getReminders);
app.post('/api/reminders', remindersLimiter, postReminder);
app.put('/api/reminders/:id', remindersLimiter, putReminder);
app.delete('/api/reminders/:id', remindersLimiter, deleteReminderHandler);
app.post('/api/reminders/:id/complete', remindersLimiter, completeReminder);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

function resolveDistPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../../dist'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return candidates[0];
}

function registerPwaAssetRoutes(distPath: string) {
  app.get('/manifest.webmanifest', (_req, res) => {
    const manifestPath = path.join(distPath, 'manifest.webmanifest');
    if (!fs.existsSync(manifestPath)) {
      res.status(404).type('application/json').json({ error: 'Manifest not found' });
      return;
    }
    res.type('application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(manifestPath);
  });

  app.get('/sw.js', (_req, res, next) => {
    const swPath = path.join(distPath, 'sw.js');
    if (!fs.existsSync(swPath)) {
      next();
      return;
    }
    res.type('application/javascript; charset=UTF-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(swPath);
  });

  app.get('/push-handler.js', (_req, res, next) => {
    const handlerPath = path.join(distPath, 'push-handler.js');
    if (!fs.existsSync(handlerPath)) {
      next();
      return;
    }
    res.type('application/javascript; charset=UTF-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(handlerPath);
  });
}

function isPwaAssetPath(urlPath: string): boolean {
  return (
    urlPath === '/manifest.webmanifest' ||
    urlPath === '/sw.js' ||
    urlPath === '/push-handler.js' ||
    /^\/workbox-.*\.js$/.test(urlPath)
  );
}

if (isProduction) {
  const distPath = resolveDistPath();
  if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    console.error(
      `[startup] Frontend build not found at ${distPath}. Run npm run build first.`,
    );
    process.exit(1);
  }

  registerPwaAssetRoutes(distPath);
  app.use(express.static(distPath, { index: false }));

  // SPA fallback for non-API GET routes (Express 4 compatible).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    if (isPwaAssetPath(req.path)) {
      res.status(404).type('application/json').json({ error: 'Not found' });
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error');
  res.status(500).json({
    error: isProduction ? 'Internal server error' : String(error),
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`);
});
