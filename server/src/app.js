'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRouter = require('./routes/auth.routes');
const workspaceRouter = require('./routes/workspace.routes');
const folderRouter = require('./routes/folder.routes');
const noteRouter = require('./routes/note.routes');
const uploadRouter = require('./routes/upload.routes');
const { authenticate } = require('./middleware/auth');
const { listByWorkspace } = require('./controllers/folder.controller');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Public auth routes (no JWT required)
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/workspaces', workspaceRouter);
app.use('/api/folders', folderRouter);
app.use('/api/notes', noteRouter);
app.use('/api/upload', uploadRouter);

// Workspace-scoped folder list (client calls GET /workspaces/:workspaceId/folders)
app.get('/api/workspaces/:workspaceId/folders', authenticate, listByWorkspace);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

module.exports = app;
