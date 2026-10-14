const EnergyGoal = require('../models/EnergyGoal');
const EnergyReading = require('../models/EnergyReading');

exports.getGoals = async (req, res, next) => {
  try {
    const goals = await EnergyGoal.find({ user: req.user._id }).sort({ createdAt: -1 });

    const now = new Date();
    const enriched = await Promise.all(
      goals.map(async (goal) => {
        const g = goal.toObject();
        const periodEnd = goal.endDate < now ? goal.endDate : now;
        const agg = await EnergyReading.aggregate([
          {
            $match: {
              user: req.user._id,
              readingDate: { $gte: goal.startDate, $lte: periodEnd },
            },
          },
          { $group: { _id: null, totalKwh: { $sum: '$kWh' } } },
        ]);
        g.actualKwh = agg[0] ? +agg[0].totalKwh.toFixed(3) : 0;
        g.progressPercent = +(((g.actualKwh / goal.targetKwh) * 100)).toFixed(1);
        g.remaining = +(goal.targetKwh - g.actualKwh).toFixed(3);
        return g;
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

exports.createGoal = async (req, res, next) => {
  try {
    const { title, targetKwh, period, startDate, endDate, notes } = req.body;
    const goal = await EnergyGoal.create({
      user: req.user._id,
      title,
      targetKwh: Number(targetKwh),
      period: period || 'monthly',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      notes: notes || '',
    });
    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await EnergyGoal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    const { title, targetKwh, period, startDate, endDate, notes, isActive } = req.body;
    if (title !== undefined) goal.title = title;
    if (targetKwh !== undefined) goal.targetKwh = Number(targetKwh);
    if (period !== undefined) goal.period = period;
    if (startDate !== undefined) goal.startDate = new Date(startDate);
    if (endDate !== undefined) goal.endDate = new Date(endDate);
    if (notes !== undefined) goal.notes = notes;
    if (isActive !== undefined) goal.isActive = isActive;
    await goal.save();
    res.json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await EnergyGoal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    res.json({ success: true, message: 'Goal deleted.' });
  } catch (err) {
    next(err);
  }
};

