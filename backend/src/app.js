const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

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
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: logger.stream,
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', require('./routes/shared/auth-routes'));
app.use('/api/admin/teachers', require('./routes/admin/teachers-routes'));

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error(err.message, {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    stack: err.stack,
  });

  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : err.message,
  });
});

module.exports = app;
