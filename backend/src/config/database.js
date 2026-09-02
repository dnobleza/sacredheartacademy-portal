const mysql = require('mysql2/promise');
const env = require('./env');
require('dotenv').config();

const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
