'use strict';

const Note = require('../models/note.model');
const Workspace = require('../models/workspace.model');

/**
 * Verify the user has access to a workspace.
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function hasWorkspaceAccess(workspaceId, userId) {
  if (!workspaceId) return false;
  const workspace = await Workspace.findById(workspaceId).select('owner members').lean();
  if (!workspace) return false;
  const isOwner = workspace.owner.toString() === userId;
  const isMember = workspace.members.some(m => m.userId.toString() === userId);
  return isOwner || isMember;
}

/**
 * Sync a batch of offline-edited notes.
 *
 * Strategy:
 *  - If local timestamp is strictly newer than server → apply (last-write-wins)
 *  - If timestamps are equal → apply (idempotent re-sync)
 *  - If server is newer AND both have real content → conflict
 *  - If server content is empty but local has content → apply (never lose work)
 *
 * @param {Array} notes  - Array of note objects from client IndexedDB
 * @param {string} userId - The requesting user's ID
 * @returns {Promise<{ synced: string[], conflicts: Array }>}
 */
async function syncNotes(notes, userId) {
  const synced = [];
  const conflicts = [];

  for (const note of notes) {
    try {
      const noteId = note.id || note._id;

      // ── Validate note has minimum required fields ──────────────────────────
      if (!note.workspaceId) {
        console.warn(`[sync] Skipping note ${noteId} — missing workspaceId`);
        continue;
      }

      // ── Authorization: user must belong to the workspace ──────────────────
      const canAccess = await hasWorkspaceAccess(note.workspaceId, userId);
      if (!canAccess) {
        console.warn(`[sync] User ${userId} denied access to workspace ${note.workspaceId}`);
        continue;
      }

      // ── Determine if note has meaningful content ───────────────────────────
      const localContent = (note.content ?? '').trim();
      const localTitle = (note.title ?? '').trim();
      const localHasContent = localContent !== '' && localContent !== '<p></p>';
      const localHasTitle = localTitle !== '';

      // Skip completely empty notes — nothing to sync
      if (!localHasContent && !localHasTitle) {
        console.warn(`[sync] Skipping note ${noteId} — no content or title`);
        continue;
      }

      // ── No ID → create new note ────────────────────────────────────────────
      if (!noteId) {
        const created = await Note.create({
          title: localTitle || 'Untitled',
          content: note.content || '',
          workspaceId: note.workspaceId,
          folderId: note.folderId || null,
          createdBy: userId,
          updatedBy: userId,
        });
        synced.push(created._id.toString());
        continue;
      }

      const serverNote = await Note.findById(noteId);

      // ── Note doesn't exist on server → recreate it ─────────────────────────
      if (!serverNote) {
        const created = await Note.create({
          _id: noteId,
          title: localTitle || 'Untitled',
          content: note.content || '',
          workspaceId: note.workspaceId,
          folderId: note.folderId || null,
          createdBy: userId,
          updatedBy: userId,
        });
        synced.push(created._id.toString());
        continue;
      }

      // ── Parse timestamps ───────────────────────────────────────────────────
      const localTs = note.updatedAt ? new Date(note.updatedAt).getTime() : 0;
      const serverTs = new Date(serverNote.updatedAt).getTime();

      const serverContent = (serverNote.content ?? '').trim();
      const serverHasContent = serverContent !== '' && serverContent !== '<p></p>';

      // ── Decision logic ─────────────────────────────────────────────────────
      // 1. Server is empty but local has content → always apply (never lose work)
      const serverEmptyLocalHasContent = !serverHasContent && localHasContent;

      // 2. Local is strictly newer (no grace period — use exact timestamps)
      //    Allow 2s tolerance only for clock skew, not 5s
      const CLOCK_SKEW_MS = 2000;
      const localIsNewer = localTs >= serverTs - CLOCK_SKEW_MS;

      if (serverEmptyLocalHasContent || localIsNewer) {
        const updateFields = { updatedBy: userId };
        if (localHasTitle) updateFields.title = localTitle;
        if (localHasContent) updateFields.content = note.content;
        if (note.folderId !== undefined) updateFields.folderId = note.folderId || null;

        await Note.findByIdAndUpdate(noteId, { $set: updateFields }, { runValidators: false });
        synced.push(noteId.toString());
      } else {
        // Server is genuinely newer — surface as conflict
        conflicts.push({
          noteId: noteId.toString(),
          localVersion: {
            id: noteId.toString(),
            title: note.title || '',
            content: note.content || '',
            workspaceId: note.workspaceId,
            folderId: note.folderId || null,
            updatedAt: note.updatedAt || new Date().toISOString(),
            createdAt: note.createdAt || new Date().toISOString(),
            createdBy: userId,
          },
          serverVersion: serverNote.toJSON(),
        });
      }
    } catch (err) {
      console.error(`[sync] Error processing note ${note.id || note._id}:`, err.message);
      // Don't rethrow — continue processing remaining notes
    }
  }

  return { synced, conflicts };
}

module.exports = { syncNotes };
