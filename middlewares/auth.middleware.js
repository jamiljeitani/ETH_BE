// middlewares/auth.middleware.js
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

async function authGuard(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });

    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.sub);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    if (user.status !== 'active') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'User disabled' } });

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}

module.exports = { authGuard };
