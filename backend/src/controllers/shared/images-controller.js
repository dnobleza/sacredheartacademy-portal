const fs = require('fs');
const path = require('path');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { UPLOAD_DIR } = require('../../middleware/upload');

const IMAGE_SELECT_FIELDS = `
  id,
  filename,
  original_name,
  mime_type,
  size_bytes,
  uploaded_by,
  created_at,
  updated_at
`;

// req.file is populated by the uploadImage middleware, which has already
// validated the type, size, and magic bytes and written the file to disk
// under its generated filename before this handler runs.
const createImage = async (req, res) => {
  const uploadedBy = req.user.userId;

  const [result] = await pool.execute(
    `INSERT INTO images (filename, original_name, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?)`,
    [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, uploadedBy],
  );

  const [rows] = await pool.execute(`SELECT ${IMAGE_SELECT_FIELDS} FROM images WHERE id = ?`, [
    result.insertId,
  ]);

  logger.info(`Image ${result.insertId} uploaded by user ${uploadedBy}`);

  return sendCreated(res, rows[0]);
};

/**
 * Streams the stored file. Content-Type comes from the STORED mime_type, not
 * from anything the client sends on this request, and the response is always
 * inline — this endpoint is the only path to a file, so there is no separate
 * "download" concern to distinguish it from.
 */
const getImageById = async (req, res) => {
  const imageId = req.params.id;

  const [rows] = await pool.execute(
    'SELECT filename, mime_type FROM images WHERE id = ?',
    [imageId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  const filePath = path.join(UPLOAD_DIR, rows[0].filename);

  // A row can outlive its file (a failed write, a manual cleanup on disk).
  // Treat that the same as "row doesn't exist" rather than letting the
  // stream error turn into a 500.
  if (!fs.existsSync(filePath)) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  res.setHeader('Content-Type', rows[0].mime_type);
  res.setHeader('Content-Disposition', 'inline');

  const stream = fs.createReadStream(filePath);

  stream.on('error', (error) => {
    logger.error(`Failed to stream image ${imageId}: ${error.message}`);
    if (!res.headersSent) {
      sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
    } else {
      res.destroy();
    }
  });

  return stream.pipe(res);
};

const deleteImage = async (req, res) => {
  const imageId = req.params.id;

  const [rows] = await pool.execute('SELECT filename, uploaded_by FROM images WHERE id = ?', [
    imageId,
  ]);

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  const { filename, uploaded_by: uploadedBy } = rows[0];

  if (uploadedBy !== req.user.userId && req.user.role !== 'admin') {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'You do not have permission to delete this image.',
    );
  }

  // Delete the row first: any FK referencing this image is ON DELETE SET
  // NULL, so this cannot fail on a still-referenced image. The goal state is
  // "no image" — if the unlink below fails, the row is already gone and a
  // stray file on disk is a harmless cleanup problem, not a dangling
  // database reference.
  await pool.execute('DELETE FROM images WHERE id = ?', [imageId]);

  const filePath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filePath, (error) => {
    if (error && error.code !== 'ENOENT') {
      logger.error(`Failed to remove image file ${filename}: ${error.message}`);
    }
  });

  logger.info(`Image ${imageId} deleted by user ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

module.exports = {
  createImage,
  getImageById,
  deleteImage,
};
