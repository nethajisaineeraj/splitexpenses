const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { signToken } = require('../utils/jwt');
const cookieOptions = require('../utils/cookieOptions');

function sendAuthCookie(res, userId) {
  const token = signToken({ id: userId });
  const cookieName = process.env.COOKIE_NAME || 'token';
  res.cookie(cookieName, token, cookieOptions);
}

async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 400);

  const user = await User.create({ name, email, password });
  sendAuthCookie(res, user._id);
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  sendAuthCookie(res, user._id);
  res.json({ user: { id: user._id, name: user.name, email: user.email } });
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  res.json({ user: { id: user._id, name: user.name, email: user.email } });
}

async function logout(req, res) {
  const cookieName = process.env.COOKIE_NAME || 'token';
  res.clearCookie(cookieName, cookieOptions);
  res.json({ message: 'Logged out' });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordToken +resetPasswordExpire');
  if (!user) {
    return res.json({ message: 'If that email exists, reset instructions were generated.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashed;
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
  res.json({ message: 'Reset token generated (dev mode)', resetUrl });
}

async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: new Date() }
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  await user.save();

  sendAuthCookie(res, user._id);
  res.json({ message: 'Password reset successful' });
}

module.exports = { register, login, me, logout, forgotPassword, resetPassword };
