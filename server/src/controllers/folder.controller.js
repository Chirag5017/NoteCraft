'use strict';

const Folder = require('../models/folder.model');
const Note = require('../models/note.model');
const Workspace = require('../models/workspace.model');

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
 * Recursively delete a folder and all its descendants and their notes.
 * @param {string} folderId
 * @returns {Promise<void>}
 */
async function deleteFolderRecursive(folderId) {
  const children = await Folder.find({ parentFolderId: folderId });
  for (const child of children) {
    await deleteFolderRecursive(child._id.toString());
  }
  await Note.deleteMany({ folderId });
  await Folder.findByIdAndDelete(folderId);
}

/**
 * POST /api/folders
 * Create a new folder.
 */
async function create(req, res) {
  try {
    const { name, workspaceId, parentFolderId } = req.body;

    const hasAccess = await verifyWorkspaceMembership(workspaceId, req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const folder = await Folder.create({
      name,
      workspaceId,
      parentFolderId: parentFolderId || null,
      createdBy: req.userId,
    });

    return res.status(201).json(folder.toJSON());
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/workspaces/:workspaceId/folders
 * List all folders in a workspace (flat array).
 */
async function listByWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;

    const hasAccess = await verifyWorkspaceMembership(workspaceId, req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const folders = await Folder.find({ workspaceId });
    return res.status(200).json(folders.map(f => f.toJSON()));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * PATCH /api/folders/:id
 * Rename or move a folder.
 */
async function update(req, res) {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }

    const hasAccess = await verifyWorkspaceMembership(folder.workspaceId.toString(), req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    if (req.body.name !== undefined) folder.name = req.body.name;
    if (req.body.parentFolderId !== undefined) folder.parentFolderId = req.body.parentFolderId || null;
    await folder.save();

    return res.status(200).json(folder.toJSON());
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * DELETE /api/folders/:id
 * Recursively delete folder and all descendants + their notes.
 */
async function remove(req, res) {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }

    const hasAccess = await verifyWorkspaceMembership(folder.workspaceId.toString(), req.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    await deleteFolderRecursive(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

module.exports = { create, listByWorkspace, update, remove, deleteFolderRecursive };
