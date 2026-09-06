const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');




fs.mkdirSync(UPLOAD_DIR, { recursive: true });




const IMAGE_MIME_TYPES = {
  'image/jpeg': { extension: '.jpg', signature: [0xff, 0xd8, 0xff] },
  'image/png': {
    extension: '.png',
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },



  'image/webp': { extension: '.webp', signature: null },
};




const DOCUMENT_MIME_TYPES = {
  ...IMAGE_MIME_TYPES,
  'application/pdf': { extension: '.pdf', signature: [0x25, 0x50, 0x44, 0x46] },
};

const ALLOWED_MIME_TYPES = IMAGE_MIME_TYPES;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;




const createUploader = ({ allowedTypes, maxFiles }) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),





      filename: (req, file, cb) => {
        const { extension } = allowedTypes[file.mimetype] || {};
        cb(null, `${crypto.randomUUID()}${extension || ''}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!allowedTypes[file.mimetype]) {
        return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      }
      return cb(null, true);
    },
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: maxFiles },
  });

const imageUpload = createUploader({ allowedTypes: IMAGE_MIME_TYPES, maxFiles: 1 });


const verifyMagicBytes = (filePath, mimeType, allowedTypes = ALLOWED_MIME_TYPES) => {
  const { signature } = allowedTypes[mimeType] || {};
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




const uploadImage = (fieldName) => (req, res, next) => {
  imageUpload.single(fieldName)(req, res, (error) => {
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

    if (!verifyMagicBytes(req.file.path, req.file.mimetype, IMAGE_MIME_TYPES)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'File does not match its declared image type.');
    }

    return next();
  });
};




const collectFiles = (req) => Object.values(req.files || {}).flat();

const discardFiles = (files) => {
  files.forEach((file) => {
    fs.unlink(file.path, () => {});
  });
};




const uploadDocuments = (fieldNames) => {
  const fields = fieldNames.map((name) => ({ name, maxCount: 1 }));
  const documentUpload = createUploader({
    allowedTypes: DOCUMENT_MIME_TYPES,
    maxFiles: fieldNames.length,
  });

  return (req, res, next) => {
    documentUpload.fields(fields)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Each document must be 5MB or smaller.');
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {


          return sendError(
            res,
            HTTP_STATUS.BAD_REQUEST,
            fieldNames.includes(error.field)
              ? 'Documents must be a PDF, JPEG, PNG, or WebP file.'
              : `${error.field} is not a document this form accepts.`,
          );
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Too many documents attached.');
        }
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Document upload failed.');
      }

      if (error) {
        return next(error);
      }

      const files = collectFiles(req);



      const mismatch = files.find(
        (file) => !verifyMagicBytes(file.path, file.mimetype, DOCUMENT_MIME_TYPES),
      );

      if (mismatch) {
        discardFiles(files.filter((file) => file !== mismatch));
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          'A document does not match its declared file type.',
        );
      }

      return next();
    });
  };
};

module.exports = {
  uploadImage,
  uploadDocuments,
  discardFiles,
  collectFiles,
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
};
