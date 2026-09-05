const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const HTTP_STATUS = require('./http-status');
const { sendError } = require('./send-response');
const { UPLOAD_DIR } = require('../middleware/upload');


const streamImage = (res, image, imageId) => {
  const filePath = path.join(UPLOAD_DIR, image.filename);

  
  
  
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
