'use strict';

const express = require('express');
const passport = require('../config/passport');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  signupValidators,
  loginValidators,
  handleValidation,
} = require('../middleware/validate');
const {
  signup,
  login,
  me,
  logout,
  googleCallback,
} = require('../controllers/auth.controller');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', authLimiter, signupValidators, handleValidation, signup);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidators, handleValidation, login);

// GET /api/auth/me (protected)
router.get('/me', authenticate, me);

// POST /api/auth/logout (protected)
router.post('/logout', authenticate, logout);

// GET /api/auth/google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`, session: false }),
  googleCallback
);

module.exports = router;
