/**
 * Socket.io setup - JWT authentication for websocket connections
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { chatHandler } from './chatHandler.js';
import { voiceHandler } from './voiceHandler.js';

/**
 * Initialize Socket.io with JWT auth and event handlers
 * @param {import('socket.io').Server} io
 */
export function initSocket(io) {
  // JWT authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded; // { userId, tenantId, role }
      socket.tenantId = decoded.tenantId;
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join tenant room for potential broadcasts
    socket.join(`tenant:${socket.tenantId}`);

    // Wire up chat and voice handlers
    chatHandler(io, socket);
    voiceHandler(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error: ${socket.id}`, err.message);
    });
  });
}
