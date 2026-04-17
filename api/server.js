const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { sequelize, User } = require('./models');
const { authenticateToken } = require('./middleware/auth');
const configByEnv = require('./config/config.js');
const { log, logError } = require('./utils/logger');

const app = express();
const PORT = 5050;
const ADMIN_DEFAULT_PASSWORD = 'ChangeMe123!';
const argEnv = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1];
const env = argEnv || process.env.NODE_ENV || 'development';
const dbConfig = configByEnv[env];

// Do NOT exit here; just log so you can see the real problem
process.on('unhandledRejection', (reason) => {
  logError('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logError('Uncaught Exception:', err);
});

app.use(cors());
app.use(express.json());

// Request logger (should never crash)
app.use((req, res, next) => {
  log('REQUEST:', req.method, req.url);
  next();
});

// Health endpoint (no DB, no routers)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

function quoteDbName(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe database name "${name}"`);
  }
  return `\`${name}\``;
}

async function ensureDatabaseAndTables() {
  if (!dbConfig || dbConfig.dialect !== 'mysql') {
    return;
  }

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: Number(dbConfig.port || 3306),
    user: dbConfig.username,
    password: dbConfig.password,
    ssl: dbConfig.dialectOptions?.ssl,
  });

  try {
    const quotedDbName = quoteDbName(dbConfig.database);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quotedDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }

  await sequelize.authenticate();
}

async function ensureBootstrapAdmin() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tablesRaw = await queryInterface.showAllTables();
    const tables = tablesRaw.map((t) => String(t).toLowerCase());

    if (!tables.includes('users')) {
      logError('Users table not found. Run migrations to enable login/auth.');
      return;
    }

    const userCount = await User.count();
    if (userCount > 0) return;

    const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const displayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator';
    const password = process.env.ADMIN_PASSWORD || ADMIN_DEFAULT_PASSWORD;
    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      username,
      displayName,
      passwordHash,
      role: 'admin',
      isActive: true,
    });

    log(`Bootstrap admin created: username="${username}"`);
    if (!process.env.ADMIN_PASSWORD) {
      log(`Bootstrap admin password="${ADMIN_DEFAULT_PASSWORD}" (change this immediately).`);
    }
  } catch (e) {
    logError('Failed to ensure bootstrap admin:', e);
  }
}

// Only after health works, enable routers + Sequelize
try {
  const authRoutes = require('./routes/auth');
  const usersRoutes = require('./routes/users');
  const membersRoutes = require('./routes/members');
  const eventsRoutes = require('./routes/events');
  const attendanceRoutes = require('./routes/attendance');
  const messagesRoutes = require('./routes/messages');
  const followupsRoutes = require('./routes/followups');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', authenticateToken, usersRoutes);

  app.use('/api/members', authenticateToken, membersRoutes);
  app.use('/api/events', authenticateToken, eventsRoutes);
  app.use('/api/attendance', authenticateToken, attendanceRoutes);
  app.use('/api/messages', authenticateToken, messagesRoutes);
  app.use('/api/followups', authenticateToken, followupsRoutes);
} catch (e) {
  logError('Failed to load routes:', e);
}

// Express error middleware (must be last)
app.use((err, req, res, next) => {
  logError('Express error middleware:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await ensureDatabaseAndTables();
  await ensureBootstrapAdmin();

  const server = app.listen(PORT, '0.0.0.0', () => {
    log(`Server listening on ${PORT}`);
  });

  server.on('error', (err) => {
    logError('Server listen error:', err);
  });
}

start();
