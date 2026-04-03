'use strict';

const Note = require('../models/note.model');
const Workspace = require('../models/workspace.model');
const Folder = require('../models/folder.model');
const { syncNotes } = require('../services/sync.service');

/**
 * Helper: verify user is a member or owner of the given workspace.
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function verifyWorkspaceMembership(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return false;
  const isOwner = workspace.owner.toString() === userId;
  const isMember = workspace.members.some(m => m.userId.toString() === userId);
  return isOwner || isMember;
}

/**
 * Helper: get all workspace IDs where user is owner or member.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
async function getUserWorkspaceIds(userId) {
  const workspaces = await Workspace.find({
    $or: [{ owner: userId }, { 'members.userId': userId }],
  }).select('_id');
  return workspaces.map(w => w._id.toString());
}

/**
 * POST /api/notes
 * Create a new note.
 */
async function create(req, res) {
  try {
    const { title, workspaceId, folderId, content } = req.body;

    const hasAccess = await verifyWorkspaceMembership(workspaceId, req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const note = await Note.create({
      title,
      content: content || '',
      workspaceId,
      folderId: folderId || null,
      createdBy: req.userId,
      updatedBy: req.userId,
    });

    return res.status(201).json(note.toJSON());
  } catch (err) {
    console.error('Note create error:', err.message);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/notes?workspaceId=X&folderId=Y
 * List notes with optional filters.
 */
async function list(req, res) {
  try {
    const { workspaceId, folderId } = req.query;

    if (!workspaceId) {
      return res.status(422).json({ error: 'workspaceId is required', code: 'VALIDATION_ERROR' });
    }

    const hasAccess = await verifyWorkspaceMembership(workspaceId, req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const filter = { workspaceId };
    if (folderId) filter.folderId = folderId;

    const notes = await Note.find(filter).sort({ updatedAt: -1 });
    return res.status(200).json(notes.map(n => n.toJSON()));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/notes/search?q=X
 * Full-text search across notes in user's workspaces.
 */
async function search(req, res) {
  try {
    const { q } = req.query;

    const workspaceIds = await getUserWorkspaceIds(req.userId);
    if (workspaceIds.length === 0) {
      return res.status(200).json([]);
    }

    const notes = await Note.find({
      $text: { $search: q },
      workspaceId: { $in: workspaceIds },
    }).limit(50);

    // Build SearchResult objects
    const workspaceMap = {};
    const folderMap = {};

    // Fetch workspace names
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).select('name');
    for (const ws of workspaces) {
      workspaceMap[ws._id.toString()] = ws.name;
    }

    // Fetch folder names for notes that have a folderId
    const folderIds = notes.filter(n => n.folderId).map(n => n.folderId.toString());
    if (folderIds.length > 0) {
      const folders = await Folder.find({ _id: { $in: folderIds } }).select('name');
      for (const f of folders) {
        folderMap[f._id.toString()] = f.name;
      }
    }

    const results = notes.map(note => {
      const content = note.content || '';
      // Build a simple snippet (first 150 chars of content)
      const snippet = content.length > 150 ? content.slice(0, 150) + '...' : content;

      // Build highlights by finding query terms in content
      const highlights = [];
      const terms = q.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        const regex = new RegExp(term, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          highlights.push({ start: match.index, end: match.index + match[0].length });
          if (highlights.length >= 10) break;
        }
      }

      const wsId = note.workspaceId.toString();
      const fId = note.folderId ? note.folderId.toString() : null;

      return {
        noteId: note._id.toString(),
        noteTitle: note.title,
        workspaceId: wsId,
        workspaceName: workspaceMap[wsId] || '',
        folderId: fId,
        folderName: fId ? (folderMap[fId] || null) : null,
        snippet,
        highlights,
      };
    });

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/notes/:id
 * Get a single note.
 */
async function getOne(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }

    const hasAccess = await verifyWorkspaceMembership(note.workspaceId.toString(), req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    return res.status(200).json(note.toJSON());
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * PATCH /api/notes/:id
 * Update a note (auto-save endpoint).
 */
async function update(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }

    const hasAccess = await verifyWorkspaceMembership(note.workspaceId.toString(), req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    // Build update object — only include fields that were sent
    const updateFields = { updatedBy: req.userId };
    if (req.body.title !== undefined) {
      updateFields.title = req.body.title.trim() || note.title;
    }
    if (req.body.content !== undefined) {
      // Never overwrite real content with an empty paragraph
      const incoming = req.body.content;
      const isEmpty = !incoming || incoming.trim() === '' || incoming === '<p></p>';
      const serverHasContent = note.content && note.content !== '<p></p>' && note.content.trim() !== '';
      if (!isEmpty || !serverHasContent) {
        updateFields.content = incoming;
      }
    }
    if (req.body.folderId !== undefined) {
      updateFields.folderId = req.body.folderId || null;
    }

    // Use findByIdAndUpdate to avoid re-running all validators on save()
    const updated = await Note.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    return res.status(200).json(updated.toJSON());
  } catch (err) {
    console.error('Note update error:', err.message);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * DELETE /api/notes/:id
 * Delete a note.
 */
async function remove(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }

    const hasAccess = await verifyWorkspaceMembership(note.workspaceId.toString(), req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    await Note.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * POST /api/notes/sync
 * Sync a batch of offline-edited notes.
 */
async function sync(req, res) {
  try {
    const { notes } = req.body;
    const result = await syncNotes(notes, req.userId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

module.exports = { create, list, search, getOne, update, remove, sync };
