const mysql = require('mysql2/promise');
const env = require('./env');
require('dotenv').config();

const buildSslOptions = () => {
  if (!env.DB_SSL) return undefined;
  const options = { minVersion: 'TLSv1.2' };
  if (env.DB_SSL_CA) options.ca = env.DB_SSL_CA;
  return options;
};

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: buildSslOptions(),
  dateStrings: ['DATE'],
});

module.exports = pool;
