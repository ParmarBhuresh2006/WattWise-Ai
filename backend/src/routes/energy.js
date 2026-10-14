const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, query } = require('express-validator');
const ctrl = require('../controllers/energyController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  },
});

router.use(protect);

router.get('/export', ctrl.exportCSV);
router.post('/import', upload.single('file'), ctrl.importCSV);
router.post('/seed-sample', ctrl.seedSampleReadings);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  validate,
], ctrl.getReadings);

router.post('/', [
  body('readingDate').notEmpty().withMessage('Reading date required').isISO8601(),
  body('kWh').isFloat({ min: 0 }).withMessage('kWh must be a non-negative number'),
  body('meterId').optional().isString().isLength({ max: 50 }),
  body('category').optional().isIn(['residential', 'commercial', 'industrial', 'other', '']),
  body('notes').optional().isString().isLength({ max: 500 }),
  validate,
], ctrl.createReading);

router.get('/:id', ctrl.getReading);

router.put('/:id', [
  body('readingDate').optional().isISO8601(),
  body('kWh').optional().isFloat({ min: 0 }),
  validate,
], ctrl.updateReading);

router.delete('/:id', ctrl.deleteReading);

module.exports = router;
