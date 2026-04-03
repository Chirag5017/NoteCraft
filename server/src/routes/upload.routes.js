'use strict';

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { uploadImage } = require('../controllers/upload.controller');

const router = express.Router();

// Store file in memory (buffer) — we stream directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per image
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/upload/image — requires JWT
router.post('/image', authenticate, upload.single('image'), uploadImage);

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image too large (max 10MB)', code: 'FILE_TOO_LARGE' });
  }
  return res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
});

module.exports = router;
