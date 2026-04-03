'use strict';

const Workspace = require('../models/workspace.model');
const Folder = require('../models/folder.model');
const Note = require('../models/note.model');
const User = require('../models/user.model');

/**
 * Helper: check if a userId is the owner of a workspace doc.
 * @param {object} workspace - Mongoose workspace document
 * @param {string} userId
 * @returns {boolean}
 */
function isOwner(workspace, userId) {
  return workspace.owner.toString() === userId;
}

/**
 * Helper: check if a userId is a member (or owner) of a workspace doc.
 * @param {object} workspace - Mongoose workspace document
 * @param {string} userId
 * @returns {boolean}
 */
function isMember(workspace, userId) {
  if (isOwner(workspace, userId)) return true;
  return workspace.members.some(m => m.userId.toString() === userId);
}

/**
 * Helper: populate members array with user objects for response.
 * @param {object} workspace - Mongoose workspace document
 * @returns {Promise<object>} Populated workspace
 */
async function populateWorkspace(workspace) {
  return Workspace.findById(workspace._id)
    .populate('members.userId', 'name email')
    .lean({ virtuals: false });
}

/**
 * Format a populated workspace lean object into the client-expected shape.
 * @param {object} ws - Lean workspace object with populated members.userId
 * @returns {object}
 */
function formatWorkspace(ws) {
  return {
    id: ws._id.toString(),
    name: ws.name,
    ownerId: ws.owner.toString(),
    members: (ws.members || []).map(m => ({
      userId: m.userId._id ? m.userId._id.toString() : m.userId.toString(),
      user: m.userId._id
        ? { id: m.userId._id.toString(), name: m.userId.name, email: m.userId.email }
        : null,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
  };
}

/**
 * POST /api/workspaces
 * Create a new workspace. Owner = req.userId.
 */
async function create(req, res) {
  try {
    const { name } = req.body;
    const workspace = await Workspace.create({
      name,
      owner: req.userId,
      members: [{ userId: req.userId, role: 'owner', joinedAt: new Date() }],
    });
    const populated = await populateWorkspace(workspace);
    return res.status(201).json(formatWorkspace(populated));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/workspaces
 * List all workspaces where user is owner or member.
 */
async function list(req, res) {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.userId },
        { 'members.userId': req.userId },
      ],
    }).populate('members.userId', 'name email').lean();

    return res.status(200).json(workspaces.map(formatWorkspace));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/workspaces/:id
 * Get a single workspace. 403 if not member.
 */
async function getOne(req, res) {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('members.userId', 'name email')
      .lean();

    if (!workspace) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }

    // Check membership using raw owner field
    const ownerId = workspace.owner.toString();
    const memberIds = workspace.members.map(m =>
      m.userId._id ? m.userId._id.toString() : m.userId.toString()
    );
    if (ownerId !== req.userId && !memberIds.includes(req.userId)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    return res.status(200).json(formatWorkspace(workspace));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * PATCH /api/workspaces/:id
 * Update workspace name. Owner only.
 */
async function update(req, res) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }
    if (!isOwner(workspace, req.userId)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    workspace.name = req.body.name || workspace.name;
    await workspace.save();

    const populated = await populateWorkspace(workspace);
    return res.status(200).json(formatWorkspace(populated));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * DELETE /api/workspaces/:id
 * Delete workspace and cascade-delete all folders and notes. Owner only.
 */
async function remove(req, res) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }
    if (!isOwner(workspace, req.userId)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    // Cascade delete
    await Note.deleteMany({ workspaceId: req.params.id });
    await Folder.deleteMany({ workspaceId: req.params.id });
    await Workspace.findByIdAndDelete(req.params.id);

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * POST /api/workspaces/:id/members
 * Add a member by email. Owner only.
 */
async function addMember(req, res) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }
    if (!isOwner(workspace, req.userId)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const { email } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const alreadyMember = workspace.members.some(
      m => m.userId.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ error: 'User is already a member', code: 'ALREADY_MEMBER' });
    }

    workspace.members.push({ userId: userToAdd._id, role: 'member', joinedAt: new Date() });
    await workspace.save();

    const populated = await populateWorkspace(workspace);
    return res.status(200).json(formatWorkspace(populated));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * DELETE /api/workspaces/:id/members/:uid
 * Remove a member. Owner only.
 */
async function removeMember(req, res) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }
    if (!isOwner(workspace, req.userId)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    workspace.members = workspace.members.filter(
      m => m.userId.toString() !== req.params.uid
    );
    await workspace.save();

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

module.exports = { create, list, getOne, update, remove, addMember, removeMember };
