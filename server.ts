import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";

import { aiService } from "./server/ai.service.ts";

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

const app = express();
const PORT = 3000;

// Middleware
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "10mb" }));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10, // Limit AI calls strictly
  standardHeaders: true,
  legacyHeaders: false,
  message: "AI generation quota reached, please try again in a minute",
});

// Apply general limiter to all routes
app.use(generalLimiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// AI endpoints with stricter limiting
app.post("/api/ai/parse-syllabus", aiLimiter, async (req, res) => {
  try {
    const { image, text } = req.body;
    const result = await aiService.parseSyllabus(image, text);
    res.json(result);
  } catch (error: any) {
    req.log.error(error, "AI Parse Error");
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/study", aiLimiter, async (req, res) => {
  try {
    const { words, type } = req.body; // type: 'quiz' | 'explanation'
    const result = await aiService.study(words, type);
    res.json(result);
  } catch (error: any) {
    req.log.error(error, "AI Study Error");
    res.status(500).json({ error: error.message });
  }
});


async function startServer() {
  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
