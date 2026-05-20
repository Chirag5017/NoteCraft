'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  noteValidators,
  updateNoteValidators,
  searchValidators,
  syncValidators,
  handleValidation,
} = require('../middleware/validate');
const { create, list, search, getOne, update, remove, sync, share, unshare, getPublic } = require('../controllers/note.controller');

const router = express.Router();

// ── Public route — NO auth required ──────────────────────────────────────────
// Must be registered BEFORE the authenticate middleware
router.get('/public/:token', getPublic);

// ── All routes below require authentication ───────────────────────────────────
router.use(authenticate);

// IMPORTANT: /search and /sync must come before /:id to avoid route conflicts
router.get('/search', searchValidators, handleValidation, search);
router.post('/sync', syncValidators, handleValidation, sync);

// Note CRUD
router.post('/', noteValidators, handleValidation, create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', updateNoteValidators, handleValidation, update);
router.delete('/:id', remove);

// Share management — authenticated, workspace member only
router.post('/:id/share', share);
router.delete('/:id/share', unshare);

module.exports = router;
