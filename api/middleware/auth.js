const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      if (!req.auth) return res.status(401).json({ error: 'Authentication required' });

      // Admins bypass all permission checks
      if (req.auth.role === 'admin') return next();

      // Load user from DB with per-request caching
      if (!req._authUser) {
        const { User } = require('../models');
        const user = await User.findByPk(req.auth.sub, {
          attributes: ['id', 'permissions', 'isActive'],
        });
        if (!user || !user.isActive) return res.status(401).json({ error: 'Unauthorized' });
        req._authUser = user;
      }

      const perms = req._authUser.permissions;
      // null permissions = full access (backward compatibility for existing editors)
      if (!perms) return next();

      if (!perms[resource]?.[action]) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = {
  signAuthToken,
  authenticateToken,
  requireAdmin,
  requirePermission,
};
