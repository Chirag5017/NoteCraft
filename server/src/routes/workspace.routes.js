'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  workspaceValidators,
  addMemberValidators,
  handleValidation,
} = require('../middleware/validate');
const {
  create,
  list,
  getOne,
  update,
  remove,
  addMember,
  removeMember,
} = require('../controllers/workspace.controller');

const router = express.Router();

// All workspace routes require authentication
router.use(authenticate);

router.post('/', workspaceValidators, handleValidation, create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', workspaceValidators, handleValidation, update);
router.delete('/:id', remove);
router.post('/:id/members', addMemberValidators, handleValidation, addMember);
router.delete('/:id/members/:uid', removeMember);

module.exports = router;
