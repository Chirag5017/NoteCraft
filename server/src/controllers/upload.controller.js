'use strict';

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/upload/image
 * Upload an image file to Cloudinary and return the secure URL.
 * Expects multipart/form-data with field name "image".
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided', code: 'NO_FILE' });
    }

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'notecraft',
          resource_type: 'image',
          // Auto-format and quality for web
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    return res.status(500).json({ error: 'Image upload failed', code: 'UPLOAD_FAILED' });
  }
}

module.exports = { uploadImage };
