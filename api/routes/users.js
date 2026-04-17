const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { logError } = require('../utils/logger');

const SALT_ROUNDS = 12;
const ALLOWED_ROLES = new Set(['admin', 'editor']);

router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'displayName', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'permissions'],
      order: [['username', 'ASC']],
    });
    res.json(users);
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const displayName = String(req.body.displayName || '').trim();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'editor').toLowerCase();
    const isActive = req.body.isActive !== false;

    if (!username || !displayName || !password) {
      return res.status(400).json({ error: 'username, displayName, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ error: 'role must be admin or editor' });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const permissions = req.body.permissions ?? null;
    const user = await User.create({ username, displayName, passwordHash, role, isActive, permissions });

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      permissions: user.permissions ?? null,
    });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const updates = {};
    if (typeof req.body.displayName === 'string') {
      const displayName = req.body.displayName.trim();
      if (!displayName) return res.status(400).json({ error: 'displayName cannot be empty' });
      updates.displayName = displayName;
    }
    if (typeof req.body.role === 'string') {
      const role = req.body.role.trim().toLowerCase();
      if (!ALLOWED_ROLES.has(role)) {
        return res.status(400).json({ error: 'role must be admin or editor' });
      }
      updates.role = role;
    }
    if (typeof req.body.isActive === 'boolean') {
      updates.isActive = req.body.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'permissions')) {
      updates.permissions = req.body.permissions ?? null;
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.auth.sub === user.id && updates.isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    await user.update(updates);
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      permissions: user.permissions ?? null,
    });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.put('/:id/password', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const password = String(req.body.password || '');
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await user.update({ passwordHash });
    res.json({ success: true });
  } catch (e) {
    logError(e);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
