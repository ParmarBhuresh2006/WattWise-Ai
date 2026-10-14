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

function calculateSlabCost(kwh, slabs = [], fixedMonthlyCharge = 0) {
  if (typeof kwh !== 'number' || isNaN(kwh) || kwh < 0) {
    throw new Error('kWh must be a non-negative number');
  }

  if (!Array.isArray(slabs) || slabs.length === 0) {

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

