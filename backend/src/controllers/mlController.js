const EnergyReading = require('../models/EnergyReading');
const MlModelMeta = require('../models/MlModelMeta');

const ML_HOST = process.env.ML_ENGINE_HOST || '127.0.0.1';
const ML_PORT = process.env.ML_ENGINE_PORT || 8001;
const ML_BASE = `http://${ML_HOST}:${ML_PORT}`;
const ML_TIMEOUT_MS = 120000;

async function mlFetch(path, options = {}) {
  const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch : (await import('node-fetch')).default;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);
  try {
    const res = await fetchFn(`${ML_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

exports.getStatus = async (req, res, next) => {
  try {
    const result = await mlFetch('/health');
    const latestMeta = await MlModelMeta.findOne({ isActive: true }).sort({ trainedAt: -1 }).lean();
    res.json({ success: true, engineOnline: result.ok, model: latestMeta || null });
  } catch (err) {

    res.json({ success: true, engineOnline: false, model: null, message: 'ML engine is not running.' });
  }
};

exports.trainModel = async (req, res, next) => {
  try {
    const { useSample } = req.body || {};

    let payload = {};

    if (useSample) {
      payload = { useSample: true, userId: String(req.user._id) };
    } else {

      const readings = await EnergyReading.find({ user: req.user._id })
        .sort({ readingDate: 1 })
        .select('readingDate kWh meterId -_id')
        .lean();

      if (readings.length < 30) {
        return res.status(400).json({
          success: false,
          message: `Insufficient data for training. Need at least 30 readings; found ${readings.length}. You can import sample readings or choose to train with sample data for demonstration.`,
        });
      }

      payload = {
        records: readings.map((r) => ({
          date: r.readingDate.toISOString(),
          kWh: r.kWh,
          meterId: r.meterId,
        })),
        userId: String(req.user._id),
        useSample: false,
      };
    }

    const result = await mlFetch('/train', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: ML_TIMEOUT_MS,
    });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.data.message || 'Training failed.' });
    }

    await MlModelMeta.updateMany({ isActive: true }, { isActive: false });
    const meta = await MlModelMeta.create({
      version: result.data.version,
      trainedAt: new Date(result.data.trainedAt),
      algorithm: result.data.algorithm,
      features: result.data.features,
      trainingSamples: result.data.trainingSamples,
      metrics: result.data.metrics,
      modelPath: result.data.modelPath,
      isActive: true,
    });

    res.json({ success: true, message: 'Model trained successfully.', data: meta });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Training timed out.' });
    }
    next(err);
  }
};

exports.getEvaluation = async (req, res, next) => {
  try {
    const result = await mlFetch('/evaluation');
    res.json({ success: result.ok, data: result.data });
  } catch (err) {
    res.status(503).json({ success: false, message: 'ML engine unavailable.' });
  }
};

exports.getForecast = async (req, res, next) => {
  try {
    const { horizon = 7 } = req.body;

    const readings = await EnergyReading.find({ user: req.user._id })
      .sort({ readingDate: 1 })
      .select('readingDate kWh -_id')
      .lean();

    if (readings.length < 14) {
      return res.status(400).json({
        success: false,
        message: `Need at least 14 readings for forecasting; found ${readings.length}.`,
      });
    }

    const payload = {
      readings: readings.map((r) => ({ date: r.readingDate.toISOString(), kWh: r.kWh })),
      horizon: Math.min(Math.max(Number(horizon), 1), 90),
      userId: String(req.user._id),
    };

    const result = await mlFetch('/forecast', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.data.message || 'Forecast failed.' });
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Forecast request timed out.' });
    }
    next(err);
  }
};

exports.detectAnomalies = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body || {};
    const filter = { user: req.user._id };
    if (startDate) filter.readingDate = { $gte: new Date(startDate) };
    if (endDate) filter.readingDate = { ...(filter.readingDate || {}), $lte: new Date(endDate) };

    const readings = await EnergyReading.find(filter)
      .sort({ readingDate: 1 })
      .select('readingDate kWh -_id')
      .lean();

    if (readings.length < 7) {
      return res.status(400).json({
        success: false,
        message: `Need at least 7 readings for anomaly detection; found ${readings.length}.`,
      });
    }

    const result = await mlFetch('/detect-anomalies', {
      method: 'POST',
      body: JSON.stringify({
        readings: readings.map((r) => ({ date: r.readingDate.toISOString(), kWh: r.kWh })),
      }),
    });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.data.message || 'Detection failed.' });
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Anomaly detection timed out.' });
    }
    next(err);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {

    const userId = req.user._id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

    const [recent, previous] = await Promise.all([
      EnergyReading.find({ user: userId, readingDate: { $gte: thirtyDaysAgo } }).sort({ readingDate: 1 }).lean(),
      EnergyReading.find({ user: userId, readingDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }).sort({ readingDate: 1 }).lean(),
    ]);

    const recommendations = [];

    if (recent.length === 0) {
      recommendations.push({
        id: 'no-data',
        title: 'Start tracking your energy',
        explanation: 'Add energy readings to receive personalized recommendations.',
        evidence: 'No readings found in the last 30 days.',
        action: 'Go to Energy Records and add your first reading.',
        estimatedImpact: null,
        confidence: 'high',
      });
      return res.json({ success: true, data: recommendations });
    }

    const recentTotal = recent.reduce((s, r) => s + r.kWh, 0);
    const prevTotal = previous.reduce((s, r) => s + r.kWh, 0);
    const settings = req.user.settings || {};
    const tariff = settings.tariffPerKwh || 8.0;

    if (previous.length > 0 && prevTotal > 0) {
      const changePercent = ((recentTotal - prevTotal) / prevTotal) * 100;
      if (changePercent > 10) {
        recommendations.push({
          id: 'period-increase',
          title: 'Consumption increased vs. previous period',
          explanation: `Your last 30-day consumption (${recentTotal.toFixed(1)} kWh) is ${changePercent.toFixed(1)}% higher than the prior 30 days (${prevTotal.toFixed(1)} kWh).`,
          evidence: `Recent: ${recentTotal.toFixed(1)} kWh vs. Prior: ${prevTotal.toFixed(1)} kWh`,
          action: 'Review which appliances or activities changed. Consider scheduling high-consumption tasks during off-peak hours.',
          estimatedImpact: `Potential saving of ₹${((recentTotal - prevTotal) * tariff).toFixed(0)} if usage returns to previous levels.`,
          confidence: 'medium',
        });
      } else if (changePercent < -10) {
        recommendations.push({
          id: 'period-decrease',
          title: 'Great progress! Consumption reduced',
          explanation: `Your recent 30-day consumption is ${Math.abs(changePercent).toFixed(1)}% lower than the previous period.`,
          evidence: `Recent: ${recentTotal.toFixed(1)} kWh vs. Prior: ${prevTotal.toFixed(1)} kWh`,
          action: 'Keep up the good work. Identify what changed and maintain those habits.',
          estimatedImpact: `Saving approximately ₹${((prevTotal - recentTotal) * tariff).toFixed(0)} per month.`,
          confidence: 'high',
        });
      }
    }

    const EnergyGoal = require('../models/EnergyGoal');
    const activeGoals = await EnergyGoal.countDocuments({ user: userId, isActive: true });
    if (activeGoals === 0 && recent.length > 0) {
      const avgMonthly = recentTotal;
      const suggested = +(avgMonthly * 0.9).toFixed(0);
      recommendations.push({
        id: 'set-goal',
        title: 'Set a monthly consumption target',
        explanation: `You have no active energy goal. Based on recent usage, a 10% reduction target would be ${suggested} kWh/month.`,
        evidence: `Current monthly usage: ~${recentTotal.toFixed(0)} kWh`,
        action: 'Go to Goals and create a monthly kWh target.',
        estimatedImpact: `A 10% reduction could save ₹${(avgMonthly * 0.1 * tariff).toFixed(0)}/month.`,
        confidence: 'high',
      });
    }

    const overnightReadings = recent.filter((r) => {
      const h = new Date(r.readingDate).getHours();
      return h >= 22 || h <= 5;
    });
    if (overnightReadings.length > 0) {
      const avgOvernight = overnightReadings.reduce((s, r) => s + r.kWh, 0) / overnightReadings.length;
      const avgAll = recentTotal / recent.length;
      if (avgOvernight > avgAll * 1.3) {
        recommendations.push({
          id: 'overnight-spike',
          title: 'Investigate overnight energy usage',
          explanation: `Average overnight readings (${avgOvernight.toFixed(2)} kWh) are significantly higher than your overall average (${avgAll.toFixed(2)} kWh).`,
          evidence: `${overnightReadings.length} overnight readings analyzed.`,
          action: 'Check for appliances left running overnight: HVAC, water heaters, or standby devices.',
          estimatedImpact: null,
          confidence: 'medium',
        });
      }
    }

    if (tariff > 0 && recent.length > 0) {
      const monthlyCost = recentTotal * tariff + (settings.fixedMonthlyCharge || 0);
      recommendations.push({
        id: 'cost-awareness',
        title: 'Monthly electricity cost estimate',
        explanation: `Based on your recent usage and configured tariff (₹${tariff}/kWh), your estimated monthly bill is ₹${monthlyCost.toFixed(0)}.`,
        evidence: `Usage: ${recentTotal.toFixed(1)} kWh × ₹${tariff} + ₹${settings.fixedMonthlyCharge || 0} fixed charge.`,
        action: 'Review your tariff settings if this differs from your actual bill.',
        estimatedImpact: null,
        confidence: 'depends on tariff accuracy',
      });
    }

    res.json({ success: true, data: recommendations });
  } catch (err) {
    next(err);
  }
};

