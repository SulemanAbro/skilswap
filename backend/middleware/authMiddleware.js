import { verifyToken } from '../utils/crypto.js';
import { UserModel } from '../models/User.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  const user = UserModel.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account no longer exists.' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'Your account has been suspended by an administrator.',
    });
  }

  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges required.' });
  }
  next();
}
