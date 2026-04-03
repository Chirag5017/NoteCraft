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
const { create, list, search, getOne, update, remove, sync } = require('../controllers/note.controller');

const router = express.Router();

// All note routes require authentication
router.use(authenticate);

// IMPORTANT: /search and /sync must come before /:id
router.get('/search', searchValidators, handleValidation, search);
router.post('/sync', syncValidators, handleValidation, sync);

// Note CRUD
router.post('/', noteValidators, handleValidation, create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', updateNoteValidators, handleValidation, update);
router.delete('/:id', remove);

module.exports = router;
