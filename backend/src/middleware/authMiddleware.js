const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');

async function protect(req, res, next) {
  const cookieName = process.env.COOKIE_NAME || 'token';
  const tokenFromCookie = req.cookies[cookieName];
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    throw new AppError('Not authenticated', 401);
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User not found', 401);
  }

  req.user = { id: user._id, email: user.email, name: user.name };
  next();
}

module.exports = { protect };
