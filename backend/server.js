import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const SRC_ASSETS_DIR = path.join(ROOT_DIR, 'src', 'assets');

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve generated assets and pure HTML/CSS/JS frontend
  app.use('/src/assets', express.static(SRC_ASSETS_DIR));
  app.use(express.static(FRONTEND_DIR));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SkillSwap API' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/admin', adminRoutes);

  // Clean JSON 404 for unknown API paths
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Fallback for root
  app.get('/', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  // Global error handler
  app.use((err, _req, res, _next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDatabase();
  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillSwap server running on http://localhost:${PORT}`);
  });
}

// Start server when run directly
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error('Failed to start SkillSwap server:', err);
    process.exit(1);
  });
}
