const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const HTTP_STATUS = require('./http-status');
const { sendError } = require('./send-response');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Streams a stored image file. Shared by the authenticated images endpoint and
 * the public announcement image path so both keep identical headers and the
 * same missing-file behaviour.
 *
 * Content-Type comes from the STORED mime_type, never from anything the client
 * sends, and the response is always inline.
 *
 * `image` is { filename, mime_type }; the caller is responsible for deciding
 * whether this request may see it.
 */
const streamImage = (res, image, imageId) => {
  const filePath = path.join(UPLOAD_DIR, image.filename);

  // A row can outlive its file (a failed write, a manual cleanup on disk).
  // Treat that the same as "row doesn't exist" rather than letting the stream
  // error turn into a 500.
  if (!fs.existsSync(filePath)) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  res.setHeader('Content-Type', image.mime_type);
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

module.exports = { streamImage };
