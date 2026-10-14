const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mlCtrl = require('../controllers/mlController');

router.use(protect);

router.get('/', mlCtrl.getRecommendations);

router.post('/:id/dismiss', (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    message: `Recommendation "${id}" dismissed.`,
    dismissedId: id,
  });
});

module.exports = router;

