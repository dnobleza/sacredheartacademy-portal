const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const logger = require('./utils/logger');
const HTTP_STATUS = require('./utils/http-status');
const { sendError } = require('./utils/send-response');
const { generalLimiter } = require('./middleware/rate-limiters');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('etag', false);

app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
    noSniff: true,
  }),
);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(generalLimiter);

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: logger.stream,
  }),
);

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'portal is in good condition',
    uptime: process.uptime(),
  });
});

app.use('/api/v1/auth', require('./routes/shared/auth-routes'));
app.use('/api/v1/admin/teachers', require('./routes/admin/teachers-routes'));
app.use('/api/v1/admin/students', require('./routes/admin/students-routes'));
app.use('/api/v1/admin/parents', require('./routes/admin/parents-routes'));

app.use((req, res) => {
  sendError(res, HTTP_STATUS.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`);
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  logger.error(err.message, {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    stack: err.stack,
  });

  sendError(
    res,
    statusCode,
    statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR ? 'Internal server error' : err.message,
  );
});

module.exports = app;
