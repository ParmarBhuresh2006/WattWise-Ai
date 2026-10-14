const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
], ctrl.register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
  validate,
], ctrl.login);

router.get('/me', protect, ctrl.getMe);
router.put('/me', protect, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('password').optional().isLength({ min: 8 }),
  validate,
], ctrl.updateMe);

module.exports = router;
