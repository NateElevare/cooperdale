const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { User } = require('../models');
const { signAuthToken, authenticateToken } = require('../middleware/auth');

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await user.update({ lastLoginAt: new Date() });

    const token = signAuthToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.auth.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(sanitizeUser(user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load current user' });
  }
});

module.exports = router;
