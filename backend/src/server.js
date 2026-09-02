require('dotenv').config();

const app = require('./app');
const pool = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

let server;

const exitOnDatabaseError = (error) => {
  logger.error(`Database connection failed: ${error.message}`, { stack: error.stack });
  process.exit(1);
};

const startServer = async () => {
  const connection = await pool.getConnection().catch(exitOnDatabaseError);
  await connection.ping().catch(exitOnDatabaseError);
  connection.release();
  logger.info(`Database connected: ${process.env.DB_NAME}@${process.env.DB_HOST}`);

  server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully.`);

  if (server) {
    server.close(() => logger.info('HTTP server closed.'));
  }

  await pool
    .end()
    .then(() => logger.info('Database pool closed.'))
    .catch((error) => logger.error(`Error closing database pool: ${error.message}`));

  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.stack : reason}`);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.stack}`);
  process.exit(1);
});

startServer();
