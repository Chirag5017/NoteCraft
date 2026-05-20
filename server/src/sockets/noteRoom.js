'use strict';

const Note = require('../models/note.model');
const User = require('../models/user.model');
const { isBlankHtml } = require('../utils/noteContent');

/**
 * socketMeta: tracks every connected socket's identity and which note room it's in.
 * @type {Map<string, { userId: string|null, guestId: string|null, name: string, color: string, noteId: string, isAnonymous: boolean, sharePermission: string, cursor: { anchor: number, head: number }|null }>}
 */
const socketMeta = new Map();

const COLLABORATOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const GUEST_NAMES = [
  'Anonymous Fox', 'Mystery Owl', 'Wandering Bear', 'Silent Wolf',
  'Curious Cat', 'Roaming Deer', 'Drifting Hawk', 'Quiet Lynx',
];

function generateColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

function randomGuestName() {
  return GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
}

async function handleLeaveNote(io, socket, noteId) {
  try {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;

    socket.leave(noteId);
    socketMeta.delete(socket.id);

    const departedId = meta.userId || meta.guestId;
    io.to(noteId).emit('user-left', { userId: departedId });
  } catch (err) {
    console.error('leave-note error:', err.message);
  }
}

function registerNoteRoomHandlers(io, socket) {

  // ── join-note ──────────────────────────────────────────────────────────────
  socket.on('join-note', async ({ noteId, user, shareToken }) => {
    try {
      let sharePermission = null;

      if (socket.isAnonymous) {
        if (!shareToken) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Share token required' });
          return;
        }
        const note = await Note.findOne({ _id: noteId, shareToken, isShared: true }).select('sharePermission');
        if (!note) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Invalid or revoked share link' });
          return;
        }
        sharePermission = note.sharePermission;
      } else {
        const note = await Note.findById(noteId).select('workspaceId shareToken sharePermission isShared');
        if (!note) {
          socket.emit('error', { code: 'NOT_FOUND', message: 'Note not found' });
          return;
        }

        const Workspace = require('../models/workspace.model');
        const workspace = await Workspace.findById(note.workspaceId).select('owner members');
        const isMember = workspace && (
          workspace.owner.toString() === socket.userId ||
          workspace.members.some(m => m.userId.toString() === socket.userId)
        );

        if (isMember) {
          sharePermission = 'edit';
        } else if (shareToken && note.shareToken === shareToken && note.isShared) {
          sharePermission = note.sharePermission;
        } else {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
          return;
        }
      }

      // Leave previous note room so opens never leak events across files
      const previousMeta = socketMeta.get(socket.id);
      if (previousMeta && previousMeta.noteId !== noteId) {
        await handleLeaveNote(io, socket, previousMeta.noteId);
      }

      socket.join(noteId);

      // Resolve display name and color
      let name = user && user.name;
      let color = user && user.color;
      const effectiveId = socket.userId || socket.guestId;

      if (!name) {
        if (socket.isAnonymous) {
          name = randomGuestName();
        } else {
          try {
            const dbUser = await User.findById(socket.userId).select('name');
            name = (dbUser && dbUser.name) || 'Unknown';
          } catch (_e) {
            name = 'Unknown';
          }
        }
      }
      if (!color) {
        color = generateColor(effectiveId);
      }

      socketMeta.set(socket.id, {
        userId: socket.userId || null,
        guestId: socket.guestId || null,
        name,
        color,
        noteId,
        isAnonymous: socket.isAnonymous,
        sharePermission,
        cursor: null,
      });

      socket.emit('session-info', {
        sessionId: effectiveId,
        name,
        color,
      });

      // Hydrate ONLY the joining client (never broadcast) — separate from live note-content edits
      try {
        const latestNote = await Note.findById(noteId).select('content title');
        if (latestNote) {
          socket.emit('note-snapshot', {
            noteId,
            content: latestNote.content || '',
            title: latestNote.title || '',
          });
        }
      } catch (err) {
        console.error('Failed to send note snapshot on join:', err.message);
      }

      // Send the joining user the current presence list
      const existingPresence = [];
      for (const [sid, meta] of socketMeta.entries()) {
        if (sid !== socket.id && meta.noteId === noteId) {
          existingPresence.push({
            userId: meta.userId || meta.guestId,
            name: meta.name,
            color: meta.color,
            isAnonymous: meta.isAnonymous,
            cursor: meta.cursor || undefined,
          });
        }
      }
      if (existingPresence.length > 0) {
        socket.emit('presence-list', { collaborators: existingPresence });
      }

      // Tell others this user joined
      socket.to(noteId).emit('user-joined', {
        userId: effectiveId,
        name,
        color,
        isAnonymous: socket.isAnonymous,
      });

      // Send the joiner each peer's last known cursor position
      for (const [, meta] of socketMeta.entries()) {
        if (meta.noteId !== noteId || !meta.cursor) continue;
        const peerId = meta.userId || meta.guestId;
        if (peerId === effectiveId) continue;
        socket.emit('cursor-update', {
          noteId,
          userId: peerId,
          name: meta.name,
          color: meta.color,
          anchor: meta.cursor.anchor,
          head: meta.cursor.head,
        });
      }

      // Tell the joining user their permission
      socket.emit('share-permission', { sharePermission });

    } catch (err) {
      console.error('join-note error:', err.message);
    }
  });

  // ── note-change: user typed something, broadcast to everyone else ──────────
  // Payload: { noteId, content (HTML string), title (string) }
  socket.on('note-change', async ({ noteId, content, title }) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;

      // Ignore edits targeted at a different file than the socket is editing
      if (meta.noteId !== noteId) return;

      if (meta.sharePermission === 'view') {
        socket.emit('error', { code: 'FORBIDDEN', message: 'This note is view-only' });
        return;
      }

      const html = content ?? '';

      // Block empty payloads from wiping a note (common on client mount / file open)
      if (isBlankHtml(html)) {
        const existing = await Note.findById(noteId).select('content');
        if (existing?.content && !isBlankHtml(existing.content)) {
          return;
        }
      }

      // Broadcast live edits to peers in this note room only
      socket.to(noteId).emit('note-content', {
        noteId,
        content: html,
        title: title ?? '',
        fromUserId: meta.userId || meta.guestId,
        fromName: meta.name,
      });

      // Persist to DB so late joiners get the latest content
      const updateFields = {};
      if (content !== undefined) updateFields.content = html;
      if (title !== undefined && title.trim()) updateFields.title = title;
      if (Object.keys(updateFields).length > 0) {
        await Note.findByIdAndUpdate(noteId, { $set: updateFields }, { runValidators: false });
      }
    } catch (err) {
      console.error('note-change error:', err.message);
    }
  });

  // ── cursor-update: live caret/selection for Google Docs–style presence ─────
  socket.on('cursor-update', ({ noteId, anchor, head }) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.noteId !== noteId) return;

      const a = typeof anchor === 'number' ? anchor : 0;
      const h = typeof head === 'number' ? head : a;
      meta.cursor = { anchor: a, head: h };

      const effectiveId = meta.userId || meta.guestId;
      socket.to(noteId).emit('cursor-update', {
        noteId,
        userId: effectiveId,
        name: meta.name,
        color: meta.color,
        anchor: a,
        head: h,
      });
    } catch (err) {
      console.error('cursor-update error:', err.message);
    }
  });

  // ── leave-note ─────────────────────────────────────────────────────────────
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

module.exports = { registerNoteRoomHandlers };
