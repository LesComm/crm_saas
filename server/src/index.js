/**
 * SaaS Conversational CRM - Server Bootstrap
 * Express + Socket.io + PostgreSQL
 */

import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
import chatRoutes from './routes/chat.routes.js';
import userRoutes from './routes/user.routes.js';
import { initSocket } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.NODE_ENV === 'production'
      ? ['https://crm.lescommunicateurs.ca', 'https://crm-api.lescommunicateurs.ca']
      : '*',
    methods: ['GET', 'POST'],
  },
});

// Global middleware — CORS for cross-origin frontend
const corsOptions = {
  origin: env.NODE_ENV === 'production'
    ? ['https://crm.lescommunicateurs.ca', 'https://crm-api.lescommunicateurs.ca']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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
      users: '/api/users/*',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', authenticate, authorize('super_admin'), tenantRoutes);
app.use('/api/credentials', authenticate, tenantContext, crmRoutes);
app.use('/api/ai-config', authenticate, tenantContext, aiConfigRoutes);
app.use('/api/conversations', authenticate, tenantContext, chatRoutes);
app.use('/api/users', authenticate, tenantContext, authorize('tenant_admin', 'super_admin'), userRoutes);
// Super admin: manage users of any tenant
app.use('/api/tenants/:tenantId/users', authenticate, authorize('super_admin'), userRoutes);

// Serve client static files (production)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback — serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({
      success: false,
      error: 'Route not found',
      code: 'NOT_FOUND',
    });
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Centralized error handler
app.use(errorHandler);

// Socket.io with JWT auth + chat handlers
initSocket(io);

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
