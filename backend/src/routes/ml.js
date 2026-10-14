const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/mlController');

router.use(protect);

router.get('/status', ctrl.getStatus);
router.post('/train', ctrl.trainModel);
router.get('/evaluation', ctrl.getEvaluation);
router.post('/forecast', ctrl.getForecast);
router.post('/detect-anomalies', ctrl.detectAnomalies);
router.get('/recommendations', ctrl.getRecommendations);

module.exports = router;
