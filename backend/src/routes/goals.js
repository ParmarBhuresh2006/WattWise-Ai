const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/goalsController');

router.use(protect);

router.get('/', ctrl.getGoals);
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 150 }),
  body('targetKwh').isFloat({ min: 0.1 }).withMessage('Target kWh must be positive'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('period').optional().isIn(['monthly', 'weekly']),
  validate,
], ctrl.createGoal);

router.put('/:id', ctrl.updateGoal);
router.delete('/:id', ctrl.deleteGoal);

module.exports = router;

