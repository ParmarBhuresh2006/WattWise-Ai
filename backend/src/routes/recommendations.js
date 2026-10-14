const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mlCtrl = require('../controllers/mlController');

router.use(protect);

// GET /api/v1/recommendations — Rule-based & ML energy saving tips
router.get('/', mlCtrl.getRecommendations);

// POST /api/v1/recommendations/:id/dismiss — Dismiss a recommendation for this session
router.post('/:id/dismiss', (req, res) => {
  const { id } = req.params;
  // Acknowledge dismissal
  res.json({
    success: true,
    message: `Recommendation "${id}" dismissed.`,
    dismissedId: id,
  });
});

module.exports = router;
