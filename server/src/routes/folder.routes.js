'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  folderValidators,
  updateFolderValidators,
  handleValidation,
} = require('../middleware/validate');
const { create, listByWorkspace, update, remove } = require('../controllers/folder.controller');

const router = express.Router();

// All folder routes require authentication
router.use(authenticate);

// POST /api/folders
router.post('/', folderValidators, handleValidation, create);

// PATCH /api/folders/:id
router.patch('/:id', updateFolderValidators, handleValidation, update);

// DELETE /api/folders/:id
router.delete('/:id', remove);

module.exports = router;
