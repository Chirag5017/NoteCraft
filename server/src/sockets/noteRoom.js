'use strict';

const Y = require('yjs');
const Note = require('../models/note.model');
const User = require('../models/user.model');

/** @type {Map<string, Y.Doc>} */
const yjsDocs = new Map();

/** @type {Map<string, { userId: string, name: string, color: string, noteId: string }>} */
const socketMeta = new Map();

const COLLABORATOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

/**
 * Generate a deterministic color for a userId.
 * @param {string} userId
 * @returns {string}
 */
function generateColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

/**
 * Get or create a Y.Doc for a note, loading persisted state from DB if first join.
 * @param {string} noteId
 * @returns {Promise<Y.Doc>}
 */
async function getOrCreateDoc(noteId) {
  if (yjsDocs.has(noteId)) {
    return yjsDocs.get(noteId);
  }

  const doc = new Y.Doc();

  try {
    const note = await Note.findById(noteId).select('yjsState');
    if (note && note.yjsState && note.yjsState.length > 0) {
      Y.applyUpdate(doc, new Uint8Array(note.yjsState));
    }
  } catch (err) {
    console.error(`Failed to load yjsState for note ${noteId}:`, err.message);
  }

  yjsDocs.set(noteId, doc);
  return doc;
}

/**
 * Persist the current Y.Doc state to MongoDB.
 * @param {string} noteId
 * @param {Y.Doc} doc
 */
async function persistDoc(noteId, doc) {
  try {
    const state = Y.encodeStateAsUpdate(doc);
    await Note.findByIdAndUpdate(noteId, { yjsState: Buffer.from(state) });
  } catch (err) {
    console.error(`Failed to persist yjsState for note ${noteId}:`, err.message);
  }
}

/**
 * Handle a socket leaving a note room.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} noteId
 */
async function handleLeaveNote(io, socket, noteId) {
  try {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;

    socket.leave(noteId);
    socketMeta.delete(socket.id);

    io.to(noteId).emit('user-left', { userId: meta.userId });

    const room = io.sockets.adapter.rooms.get(noteId);
    if (!room || room.size === 0) {
      const doc = yjsDocs.get(noteId);
      if (doc) {
        await persistDoc(noteId, doc);
        doc.destroy();
        yjsDocs.delete(noteId);
      }
    }
  } catch (err) {
    console.error('leave-note error:', err.message);
  }
}

/**
 * Register all note room event handlers for a socket.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerNoteRoomHandlers(io, socket) {
  socket.on('join-note', async ({ noteId, user }) => {
    try {
      socket.join(noteId);

      let name = user && user.name;
      let color = user && user.color;

      if (!name) {
        try {
          const dbUser = await User.findById(socket.userId).select('name');
          name = (dbUser && dbUser.name) || 'Unknown';
        } catch (_e) {
          name = 'Unknown';
        }
      }
      if (!color) {
        color = generateColor(socket.userId);
      }

      socketMeta.set(socket.id, { userId: socket.userId, name, color, noteId });

      const doc = await getOrCreateDoc(noteId);
      const currentState = Y.encodeStateAsUpdate(doc);
      socket.emit('note-update', { noteId, update: Array.from(currentState) });

      socket.to(noteId).emit('user-joined', { userId: socket.userId, name, color });
    } catch (err) {
      console.error('join-note error:', err.message);
    }
  });

  socket.on('note-change', async ({ noteId, update }) => {
    try {
      const doc = yjsDocs.get(noteId);
      if (!doc) return;

      Y.applyUpdate(doc, new Uint8Array(update));
      await persistDoc(noteId, doc);

      socket.to(noteId).emit('note-update', { noteId, update });
    } catch (err) {
      console.error('note-change error:', err.message);
    }
  });

  socket.on('leave-note', async ({ noteId }) => {
    await handleLeaveNote(io, socket, noteId);
  });

  socket.on('disconnect', async () => {
    const meta = socketMeta.get(socket.id);
    if (meta) {
      await handleLeaveNote(io, socket, meta.noteId);
    }
  });
}

module.exports = { registerNoteRoomHandlers, yjsDocs };
