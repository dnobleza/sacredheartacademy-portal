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
  // Return DATE columns as 'YYYY-MM-DD' strings rather than Date objects.
  // A DATE has no time or zone, but the driver builds a Date at local
  // midnight, which JSON.stringify then writes as a UTC instant — east of
  // Greenwich that lands on the previous day, so an edit form prefilled from
  // the API showed a date one day earlier than the stored one. DATETIME and
  // TIMESTAMP are unaffected and stay as Date objects.
  dateStrings: ['DATE'],
});

module.exports = pool;
