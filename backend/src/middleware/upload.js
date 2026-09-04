const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// uploads/ holds no tracked files and is git-ignored, so it does not exist on
// a fresh clone or a new deployment — without this the first upload fails with
// an ENOENT that surfaces as a 500.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Maps the mime type multer accepted onto the file extension we write to
// disk, and onto the magic-byte signature it must start with. Anything not
// in this table is rejected before it ever touches the filesystem.
const ALLOWED_MIME_TYPES = {
  'image/jpeg': { extension: '.jpg', signature: [0xff, 0xd8, 0xff] },
  'image/png': {
    extension: '.png',
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  // WebP has no single fixed byte sequence: it's a RIFF container, so the
  // check below reads offset 0 ("RIFF") and offset 8 ("WEBP") separately
  // rather than one contiguous signature.
  'image/webp': { extension: '.webp', signature: null },
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // CLAUDE.md: never trust the client-supplied filename. The original name is
  // kept only as display metadata (original_name); the name on disk is a
  // fresh UUID plus an extension derived from the mime type WE accepted, not
  // from anything in the upload. This closes off path traversal and
  // filename-collision overwrites in one move.
  filename: (req, file, cb) => {
    const { extension } = ALLOWED_MIME_TYPES[file.mimetype] || {};
    cb(null, `${crypto.randomUUID()}${extension || ''}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

/**
 * Reads back the bytes multer just wrote and confirms they match the mime
 * type the row is about to claim. multer's file.mimetype comes straight from
 * the client's Content-Type header, which costs nothing to spoof — a caller
 * can name a script `photo.jpg`, send it as image/jpeg, and multer will write
 * it to disk unquestioned. Without this check that file is then served back
 * from our own origin under an image content type. Deletes the file and
 * returns false on mismatch so the caller can 400 instead of storing it.
 */
const verifyMagicBytes = (filePath, mimeType) => {
  const { signature } = ALLOWED_MIME_TYPES[mimeType] || {};
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(12);
  fs.readSync(fd, header, 0, 12, 0);
  fs.closeSync(fd);

  let matches;
  if (mimeType === 'image/webp') {
    matches = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  } else {
    matches = signature.every((byte, index) => header[index] === byte);
  }

  if (!matches) {
    fs.unlinkSync(filePath);
  }

  return matches;
};

// Wraps multer's single-file handler so a MulterError comes back as the
// house { success: false, message } shape instead of bubbling to the
// generic error middleware as a raw 500.
const uploadImage = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image must be 5MB or smaller.');
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          'Image must be a JPEG, PNG, or WebP file.',
        );
      }
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image upload failed.');
    }

    if (error) {
      return next(error);
    }

    if (!req.file) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'An image file is required.');
    }

    if (!verifyMagicBytes(req.file.path, req.file.mimetype)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'File does not match its declared image type.');
    }

    return next();
  });
};

module.exports = {
  uploadImage,
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
};
