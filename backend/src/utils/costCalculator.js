/**
 * costCalculator.js — Configurable Electricity Tariff & Cost Estimator.
 * 
 * Implements Module D requirements:
 * - User-configurable price per kWh
 * - Optional fixed monthly charge
 * - Optional tariff slabs (tiered pricing)
 * - Estimated daily, weekly, and monthly costs
 * - Comparison between historical and predicted electricity expenses
 * - Carbon emission estimates (kg CO₂)
 * 
 * All functions are pure, deterministic, and unit-tested.
 */

/**
 * Standard linear tariff calculation.
 * cost = (kWh * tariffPerKwh) + fixedMonthlyCharge
 * 
 * @param {number} kwh - Energy consumption in kilowatt-hours
 * @param {number} tariffPerKwh - Rate per kWh (e.g., INR 8.0)
 * @param {number} fixedMonthlyCharge - Optional fixed monthly surcharge
 * @returns {number} Estimated total cost rounded to 2 decimal places
 */
function calculateFlatCost(kwh, tariffPerKwh = 8.0, fixedMonthlyCharge = 0) {
  if (typeof kwh !== 'number' || isNaN(kwh) || kwh < 0) {
    throw new Error('kWh must be a non-negative number');
  }
  if (typeof tariffPerKwh !== 'number' || isNaN(tariffPerKwh) || tariffPerKwh < 0) {
    throw new Error('Tariff must be a non-negative number');
  }
  const energyCost = kwh * tariffPerKwh;
  const total = energyCost + Math.max(0, fixedMonthlyCharge || 0);
  return Number(total.toFixed(2));
}

/**
 * Tiered tariff (slab) calculation.
 * Slabs format: [ { upTo: 100, rate: 4.5 }, { upTo: 300, rate: 7.0 }, { upTo: Infinity, rate: 9.5 } ]
 * 
 * @param {number} kwh - Energy consumption in kWh
 * @param {Array<{upTo: number, rate: number}>} slabs - Progressive tariff brackets
 * @param {number} fixedMonthlyCharge - Fixed monthly charge
 * @returns {{ energyCost: number, fixedCharge: number, totalCost: number, breakdown: Array }}
 */
function calculateSlabCost(kwh, slabs = [], fixedMonthlyCharge = 0) {
  if (typeof kwh !== 'number' || isNaN(kwh) || kwh < 0) {
    throw new Error('kWh must be a non-negative number');
  }

  if (!Array.isArray(slabs) || slabs.length === 0) {
    // Fall back to flat tariff with default rate
    return {
      energyCost: calculateFlatCost(kwh, 8.0, 0),
      fixedCharge: Number((fixedMonthlyCharge || 0).toFixed(2)),
      totalCost: calculateFlatCost(kwh, 8.0, fixedMonthlyCharge),
      breakdown: [{ slab: 'Default (0+ kWh)', kwh, rate: 8.0, cost: calculateFlatCost(kwh, 8.0, 0) }],
    };
  }

  let remainingKwh = kwh;
  let previousLimit = 0;
  let totalEnergyCost = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (remainingKwh <= 0) break;
    const slabSpan = slab.upTo === Infinity ? remainingKwh : slab.upTo - previousLimit;
    const kwhInSlab = Math.min(remainingKwh, slabSpan);

    if (kwhInSlab > 0) {
      const slabCost = kwhInSlab * slab.rate;
      totalEnergyCost += slabCost;
      breakdown.push({
        slab: `${previousLimit} - ${slab.upTo === Infinity ? 'Above' : slab.upTo} kWh`,
        kwh: Number(kwhInSlab.toFixed(3)),
        rate: slab.rate,
        cost: Number(slabCost.toFixed(2)),
      });
      remainingKwh -= kwhInSlab;
    }
    previousLimit = slab.upTo;
  }

  const energyCost = Number(totalEnergyCost.toFixed(2));
  const fixed = Number((fixedMonthlyCharge || 0).toFixed(2));
  const totalCost = Number((energyCost + fixed).toFixed(2));

  return {
    energyCost,
    fixedCharge: fixed,
    totalCost,
    breakdown,
  };
}

/**
 * Compares current vs previous period consumption and computes savings or cost increases.
 * 
 * @param {number} currentKwh - Current period total kWh
 * @param {number} previousKwh - Previous period total kWh
 * @param {number} tariffPerKwh - Configured tariff
 * @returns {object} Comparison results
 */
function comparePeriodExpenses(currentKwh, previousKwh, tariffPerKwh = 8.0) {
  const currentCost = calculateFlatCost(currentKwh, tariffPerKwh, 0);
  const previousCost = calculateFlatCost(previousKwh, tariffPerKwh, 0);
  const diffKwh = Number((currentKwh - previousKwh).toFixed(3));
  const diffCost = Number((currentCost - previousCost).toFixed(2));
  const percentChange = previousKwh > 0 ? Number((((currentKwh - previousKwh) / previousKwh) * 100).toFixed(1)) : null;

  return {
    currentKwh,
    previousKwh,
    currentCost,
    previousCost,
    diffKwh,
    diffCost,
    percentChange,
    isIncrease: diffCost > 0,
    isDecrease: diffCost < 0,
  };
}

/**
 * Estimates carbon emissions from electricity consumption using a grid emission factor.
 * Default factor: 0.82 kg CO₂/kWh (Central Electricity Authority CEA India average).
 * 
 * @param {number} kwh - Energy consumption in kWh
 * @param {number} emissionFactor - kg CO₂ per kWh (default 0.82)
 * @returns {{ kgCO2: number, metricTonsCO2: number }}
 */
function estimateCarbonEmissions(kwh, emissionFactor = 0.82) {
  if (typeof kwh !== 'number' || isNaN(kwh) || kwh < 0) {
    throw new Error('kWh must be a non-negative number');
  }
  const kgCO2 = Number((kwh * (emissionFactor || 0.82)).toFixed(2));
  const metricTonsCO2 = Number((kgCO2 / 1000).toFixed(4));
  return { kgCO2, metricTonsCO2, emissionFactor };
}

module.exports = {
  calculateFlatCost,
  calculateSlabCost,
  comparePeriodExpenses,
  estimateCarbonEmissions,
};
