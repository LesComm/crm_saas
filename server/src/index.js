/**
 * SaaS Conversational CRM - Server Bootstrap
 * Express + Socket.io + PostgreSQL
 */

import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate, authorize } from './middleware/auth.js';
import { tenantContext } from './middleware/tenantContext.js';
import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import crmRoutes from './routes/crm.routes.js';
import aiConfigRoutes from './routes/aiConfig.routes.js';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
});

// Global middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check (no auth)
app.get('/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// API info (no auth)
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    name: 'SaaS Conversational CRM API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: 'POST /api/auth/*',
      tenants: '/api/tenants/*',
      conversations: '/api/conversations/*',
      credentials: '/api/credentials/*',
      aiConfig: '/api/ai-config/*',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', authenticate, authorize('super_admin'), tenantRoutes);
app.use('/api/credentials', authenticate, tenantContext, crmRoutes);
app.use('/api/ai-config', authenticate, tenantContext, aiConfigRoutes);
// TODO: Mount as they are built
// app.use('/api/conversations', authenticate, tenantContext, chatRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
});

// Centralized error handler
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
  });

  // TODO: Wire up chat and voice handlers
  // chatHandler(io, socket);
  // voiceHandler(io, socket);
});

// Start server
async function start() {
  try {
    await testConnection();
    console.log('PostgreSQL connected.');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  httpServer.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

start();
