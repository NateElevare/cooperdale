'use strict';

const fs = require('fs');
const path = require('path');

const logFile = fs.createWriteStream(path.join(__dirname, '../app.log'), { flags: 'a' });

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(line);
  logFile.write(line + '\n');
}

function logError(...args) {
  const line = `[${new Date().toISOString()}] ERROR: ${args.join(' ')}`;
  console.error(line);
  logFile.write(line + '\n');
}

module.exports = { log, logError };
