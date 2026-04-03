'use strict';

const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token for the given userId.
 * @param {string} userId - The user's MongoDB ObjectId as string
 * @returns {string} Signed JWT token
 */
function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Verify and decode a JWT token.
 * @param {string} token - The JWT token string
 * @returns {{ userId: string }} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
