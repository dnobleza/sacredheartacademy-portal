require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const DIRS = ['init', 'migrations'];

const DEFAULT_DIR = 'init';

const buildSslOptions = () => {
  if (!env.DB_SSL) return undefined;
  const options = { minVersion: 'TLSv1.2' };
  if (env.DB_SSL_CA) options.ca = env.DB_SSL_CA;
  return options;
};

const collectFiles = (only) => {
  const dirs = [only || DEFAULT_DIR];
  return dirs.flatMap((dir) => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath)
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .map((name) => ({ label: `${dir}/${name}`, filePath: path.join(dirPath, name) }));
  });
};

const run = async () => {
  const only = process.argv[2];
  if (only && !DIRS.includes(only)) {
    throw new Error(`Unknown directory "${only}". Use one of: ${DIRS.join(', ')}`);
  }

  const files = collectFiles(only);
  if (files.length === 0) {
    console.log('No .sql files found.');
    return;
  }

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: buildSslOptions(),
    multipleStatements: true,
  });

  try {
    for (const { label, filePath } of files) {
      const sql = fs.readFileSync(filePath, 'utf8').trim();
      if (!sql) continue;
      process.stdout.write(`Applying ${label} ... `);
      await connection.query(sql);
      console.log('done');
    }
    console.log(`\nApplied ${files.length} file(s) to ${env.DB_NAME} on ${env.DB_HOST}.`);
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(`\nFailed: ${error.message}`);
  process.exit(1);
});
