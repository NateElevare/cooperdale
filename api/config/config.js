'use strict';

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'config.json');
const raw = fs.readFileSync(jsonPath, 'utf8');
const config = JSON.parse(raw);

function loadPemMaybe(fileName) {
  if (!fileName) return undefined;
  const fullPath = path.join(__dirname, fileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`SSL file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath);
}

for (const envName of Object.keys(config)) {
  const ssl = config[envName]?.dialectOptions?.ssl;
  if (!ssl) continue;

  const ca = loadPemMaybe(ssl.caFile);
  const cert = loadPemMaybe(ssl.certFile);
  const key = loadPemMaybe(ssl.keyFile);

  if (ca) ssl.ca = ca;
  if (cert) ssl.cert = cert;
  if (key) ssl.key = key;

  delete ssl.caFile;
  delete ssl.certFile;
  delete ssl.keyFile;
}

module.exports = config;
