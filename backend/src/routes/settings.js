const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

router.use(protect);
router.get('/', ctrl.getSettings);
router.put('/', ctrl.updateSettings);

module.exports = router;
