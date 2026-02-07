const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

const config = loadConfig();

const pool = mysql.createPool({
  host: config.database.host,
  port: Number(config.database.port || 3306),
  user: config.database.username,
  password: config.database.password,
  database: config.database.dbname,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true, // only if you run multi-statement schema SQL
});

module.exports = { pool, config };