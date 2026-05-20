'use strict';

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const { registerNoteRoomHandlers } = require('./noteRoom');

/**
 * Initialize Socket.IO server on the given HTTP server.
 * Supports both authenticated users (JWT) and anonymous public viewers.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware — allow anonymous connections for public note access
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token) {
        // Anonymous viewer — assign a guest identity
        socket.userId = null;
        socket.isAnonymous = true;
        // Use a random guest ID so presence tracking works
        socket.guestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
        return next();
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.isAnonymous = false;
      next();
    } catch (err) {
      // Invalid token — treat as anonymous rather than rejecting
      socket.userId = null;
      socket.isAnonymous = true;
      socket.guestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
      next();
    }
  });

  io.on('connection', (socket) => {
    registerNoteRoomHandlers(io, socket);
  });

  return io;
}

module.exports = { initSocketIO };
