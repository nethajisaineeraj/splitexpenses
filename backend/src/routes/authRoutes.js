const express = require('express');
const { body, param } = require('express-validator');
const { register, login, me, logout, forgotPassword, resetPassword } = require('../controllers/authController');
const { validateRequest } = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email required'), body('password').notEmpty().withMessage('Password is required')],
  validateRequest,
  login
);

router.post('/forgot-password', [body('email').isEmail().withMessage('Valid email required')], validateRequest, forgotPassword);
router.post(
  '/reset-password/:token',
  [param('token').isLength({ min: 20 }).withMessage('Invalid reset token'), body('password').isLength({ min: 6 })],
  validateRequest,
  resetPassword
);

router.get('/me', protect, me);
router.post('/logout', protect, logout);

module.exports = router;
