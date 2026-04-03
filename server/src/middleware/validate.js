'use strict';

const { body, query, validationResult } = require('express-validator');

/**
 * Middleware to check express-validator results and return 422 on failure.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array(),
    });
  }
  next();
}

/** Validators for POST /auth/signup */
const signupValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

/** Validators for POST /auth/login */
const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/** Validators for POST/PATCH /workspaces */
const workspaceValidators = [
  body('name').trim().notEmpty().withMessage('Workspace name is required'),
];

/** Validators for POST /workspaces/:id/members */
const addMemberValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

/** Validators for POST /folders */
const folderValidators = [
  body('name').trim().notEmpty().withMessage('Folder name is required'),
  body('workspaceId').notEmpty().withMessage('workspaceId is required'),
];

/** Validators for PATCH /folders/:id */
const updateFolderValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
];

/** Validators for POST /notes */
const noteValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('workspaceId').notEmpty().withMessage('workspaceId is required'),
];

/** Validators for PATCH /notes/:id */
const updateNoteValidators = [
  // title is optional on update — if provided, just sanitize it (don't reject empty)
  body('title').optional().trim(),
  body('content').optional(),
  body('folderId').optional(),
];

/** Validators for GET /notes/search */
const searchValidators = [
  query('q').trim().notEmpty().withMessage('Search query q is required'),
];

/** Validators for POST /notes/sync */
const syncValidators = [
  body('notes').isArray({ min: 1 }).withMessage('notes must be a non-empty array'),
];

module.exports = {
  handleValidation,
  signupValidators,
  loginValidators,
  workspaceValidators,
  addMemberValidators,
  folderValidators,
  updateFolderValidators,
  noteValidators,
  updateNoteValidators,
  searchValidators,
  syncValidators,
};
