import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlanningAssistant } from './assistant.js';
import type { PlanRequestBody } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post('/api/assistant/plan', async (req, res) => {
  try {
    const body = req.body as PlanRequestBody;

    if (!body?.message || typeof body.message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    if (!body.selectedDate || typeof body.selectedDate !== 'string') {
      res.status(400).json({ error: 'selectedDate is required (yyyy-MM-dd)' });
      return;
    }

    const plan = await runPlanningAssistant({
      message: body.message.trim(),
      selectedDate: body.selectedDate,
      language: body.language === 'ru' ? 'ru' : 'en',
      events: Array.isArray(body.events) ? body.events : [],
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
    });

    res.json(plan);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Assistant request failed';
    console.error('[assistant]', message);
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Calendar planner API listening on http://localhost:${port}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      'Warning: OPENAI_API_KEY is missing. Create server/.env from server/.env.example',
    );
  }
});
