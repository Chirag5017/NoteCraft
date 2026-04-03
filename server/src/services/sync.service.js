'use strict';

const Note = require('../models/note.model');

/**
 * Sync a batch of offline-edited notes using last-write-wins conflict resolution.
 * @param {Array} notes - Array of note objects from client
 * @param {string} userId - The requesting user's ID
 * @returns {Promise<{ synced: string[], conflicts: Array }>}
 */
async function syncNotes(notes, userId) {
  const synced = [];
  const conflicts = [];

  for (const note of notes) {
    try {
      // Skip notes with no meaningful content to prevent overwriting with empty
      const hasContent = (note.content && note.content.trim() !== '' && note.content !== '<p></p>');
      const hasTitle = note.title && note.title.trim() !== '';
      if (!hasContent && !hasTitle) continue;

      if (!note.id && !note._id) {
        // No ID — create new note
        const created = await Note.create({
          title: note.title || 'Untitled',
          content: note.content || '',
          workspaceId: note.workspaceId,
          folderId: note.folderId || null,
          createdBy: userId,
          updatedBy: userId,
        });
        synced.push(created._id.toString());
        continue;
      }

      const noteId = note.id || note._id;
      const serverNote = await Note.findById(noteId);

      if (!serverNote) {
        // Note doesn't exist on server — create it
        const created = await Note.create({
          _id: noteId,
          title: note.title || 'Untitled',
          content: note.content || '',
          workspaceId: note.workspaceId,
          folderId: note.folderId || null,
          createdBy: userId,
          updatedBy: userId,
        });
        synced.push(created._id.toString());
        continue;
      }

      const localUpdatedAt = new Date(note.updatedAt).getTime();
      const serverUpdatedAt = new Date(serverNote.updatedAt).getTime();

      // Allow 5 second grace period for clock skew between client and server
      const CLOCK_SKEW_MS = 5000;
      const localIsNewer = localUpdatedAt >= (serverUpdatedAt - CLOCK_SKEW_MS);

      // Also apply if server content is empty but local has content
      const serverIsEmpty = !serverNote.content || serverNote.content === '<p></p>' || serverNote.content.trim() === '';
      const localHasContent = hasContent;

      if (localIsNewer || (serverIsEmpty && localHasContent)) {
        // Only update fields that have real values
        const updateFields = { updatedBy: userId };
        if (note.title && note.title.trim()) updateFields.title = note.title;
        if (hasContent) updateFields.content = note.content;
        if (note.folderId !== undefined) updateFields.folderId = note.folderId || null;

        await Note.findByIdAndUpdate(noteId, updateFields, { runValidators: false });
        synced.push(noteId.toString());
      } else {
        conflicts.push({
          noteId: noteId.toString(),
          localVersion: note,
          serverVersion: serverNote.toJSON(),
        });
      }
    } catch (err) {
      console.error(`Sync error for note ${note.id || note._id}:`, err.message);
    }
  }

  return { synced, conflicts };
}

module.exports = { syncNotes };
