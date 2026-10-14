const EnergyReading = require('../models/EnergyReading');
const { calculateFlatCost, estimateCarbonEmissions } = require('../utils/costCalculator');

exports.getSummary = async (req, res, next) => {
  try {
    const { period = 'monthly', year, month } = req.query;
    const userId = req.user._id;

    const now = new Date();
    let startDate, endDate, prevStart, prevEnd;

    if (period === 'daily') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      prevStart = new Date(startDate); prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(endDate); prevEnd.setDate(prevEnd.getDate() - 1);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      prevStart = new Date(startDate); prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(endDate); prevEnd.setDate(prevEnd.getDate() - 7);
    } else {

      const y = year ? Number(year) : now.getFullYear();
      const m = month ? Number(month) - 1 : now.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(y, m - 1, 1);
      prevEnd = new Date(y, m, 0, 23, 59, 59, 999);
    }

    const [current, previous] = await Promise.all([
      EnergyReading.find({ user: userId, readingDate: { $gte: startDate, $lte: endDate } }).lean(),
      EnergyReading.find({ user: userId, readingDate: { $gte: prevStart, $lte: prevEnd } }).lean(),
    ]);

    const totalKwh = current.reduce((s, r) => s + r.kWh, 0);
    const prevKwh = previous.reduce((s, r) => s + r.kWh, 0);

    const daysDiff = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
    const avgDaily = totalKwh / daysDiff;

    const settings = req.user.settings || {};
    const tariff = settings.tariffPerKwh || 8.0;
    const fixed = period === 'monthly' ? (settings.fixedMonthlyCharge || 0) : 0;
    const estimatedCost = calculateFlatCost(totalKwh, tariff, fixed);
    const prevCost = calculateFlatCost(prevKwh, tariff, fixed);
    const emissions = estimateCarbonEmissions(totalKwh, settings.emissionFactor || 0.82);

    const changePercent = prevKwh > 0 ? ((totalKwh - prevKwh) / prevKwh) * 100 : null;

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        totalKwh: +totalKwh.toFixed(3),
        avgDailyKwh: +avgDaily.toFixed(3),
        readingCount: current.length,
        estimatedCost,
        prevTotalKwh: +prevKwh.toFixed(3),
        prevEstimatedCost: prevCost,
        changePercent: changePercent !== null ? +changePercent.toFixed(1) : null,
        tariffPerKwh: tariff,
        currency: settings.currency || 'INR',
        carbonEmissionsKg: emissions.kgCO2,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getConsumption = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const filter = { user: req.user._id };
    if (startDate) filter.readingDate = { ...(filter.readingDate || {}), $gte: new Date(startDate) };
    if (endDate) filter.readingDate = { ...(filter.readingDate || {}), $lte: new Date(endDate) };

    let dateFormat;
    if (groupBy === 'month') dateFormat = '%Y-%m';
    else if (groupBy === 'week') dateFormat = '%Y-%U';
    else dateFormat = '%Y-%m-%d';

    const agg = await EnergyReading.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$readingDate' } },
          totalKwh: { $sum: '$kWh' },
          count: { $sum: 1 },
          avgKwh: { $avg: '$kWh' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const tariff = (req.user.settings || {}).tariffPerKwh || 8.0;
    const data = agg.map((d) => ({
      date: d._id,
      totalKwh: +d.totalKwh.toFixed(3),
      avgKwh: +d.avgKwh.toFixed(3),
      count: d.count,
      estimatedCost: +(d.totalKwh * tariff).toFixed(2),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getCostAnalysis = async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.user._id;
    const settings = req.user.settings || {};
    const tariff = settings.tariffPerKwh || 8.0;
    const fixed = settings.fixedMonthlyCharge || 0;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const agg = await EnergyReading.aggregate([
      { $match: { user: userId, readingDate: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$readingDate' } },
          totalKwh: { $sum: '$kWh' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const data = agg.map((d) => ({
      month: d._id,
      totalKwh: +d.totalKwh.toFixed(3),
      estimatedCost: +(d.totalKwh * tariff + fixed).toFixed(2),
      energyCost: +(d.totalKwh * tariff).toFixed(2),
      fixedCost: fixed,
    }));

    res.json({ success: true, data, tariffPerKwh: tariff, fixedMonthlyCharge: fixed });
  } catch (err) {
    next(err);
  }
};

