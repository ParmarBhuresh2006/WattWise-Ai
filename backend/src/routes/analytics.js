const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const analyticsCtrl = require('../controllers/analyticsController');
const mlCtrl = require('../controllers/mlController');

router.use(protect);

router.get('/summary', analyticsCtrl.getSummary);
router.get('/consumption', analyticsCtrl.getConsumption);
router.get('/cost', analyticsCtrl.getCostAnalysis);

module.exports = router;

