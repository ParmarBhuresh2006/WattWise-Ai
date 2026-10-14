const User = require('../models/User');

// GET /api/v1/settings
exports.getSettings = async (req, res) => {
  res.json({ success: true, data: req.user.settings || {} });
};

// PUT /api/v1/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const { tariffPerKwh, fixedMonthlyCharge, emissionFactor, currency } = req.body;
    const user = await User.findById(req.user._id);

    if (tariffPerKwh !== undefined) user.settings.tariffPerKwh = Number(tariffPerKwh);
    if (fixedMonthlyCharge !== undefined) user.settings.fixedMonthlyCharge = Number(fixedMonthlyCharge);
    if (emissionFactor !== undefined) user.settings.emissionFactor = Number(emissionFactor);
    if (currency !== undefined) user.settings.currency = String(currency).toUpperCase().slice(0, 5);

    await user.save();
    res.json({ success: true, data: user.settings });
  } catch (err) {
    next(err);
  }
};
