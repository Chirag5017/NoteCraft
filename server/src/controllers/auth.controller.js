'use strict';

const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;

function normalizeEmail(email) {
  return email && email.trim().toLowerCase();
}

/**
 * POST /api/auth/signup
 * Creates a new user account.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function signup(req, res) {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use', code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user._id.toString());

    return res.status(201).json({ user: user.toJSON(), token });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function login(req, res) {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = signToken(user._id.toString());
    return res.status(200).json({ user: user.toJSON(), token });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function me(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    }
    // Return user directly — client RTK Query getMe expects User shape, not { user }
    return res.status(200).json(user.toJSON());
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

/**
 * POST /api/auth/logout
 * Stateless logout — client discards the token.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function logout(req, res) {
  return res.status(200).json({ success: true });
}

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback, issues JWT, redirects to frontend.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function googleCallback(req, res) {
  try {
    const user = req.user;
    const token = signToken(user._id.toString());
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}?token=${token}`);
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
}

module.exports = { signup, login, me, logout, googleCallback };
