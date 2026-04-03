'use strict';

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const { registerNoteRoomHandlers } = require('./noteRoom');

/**
 * Initialize Socket.IO server on the given HTTP server.
 * @param {import('http').Server} httpServer - The HTTP server instance
 * @returns {import('socket.io').Server} The Socket.IO server instance
 */
function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: no token provided'));
      }
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  // Register connection handler
  io.on('connection', (socket) => {
    registerNoteRoomHandlers(io, socket);
  });

  return io;
}

module.exports = { initSocketIO };
