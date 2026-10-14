const {
  calculateFlatCost,
  calculateSlabCost,
  comparePeriodExpenses,
  estimateCarbonEmissions,
} = require('../src/utils/costCalculator');

describe('Module D: Cost Calculator Unit Tests', () => {
  describe('calculateFlatCost', () => {
    test('calculates correct cost for positive kWh and standard tariff', () => {

      expect(calculateFlatCost(100, 8.0, 0)).toBe(800.0);
    });

    test('adds fixed monthly charge accurately', () => {

      expect(calculateFlatCost(100, 8.0, 150)).toBe(950.0);
    });

    test('handles zero consumption properly', () => {
      expect(calculateFlatCost(0, 8.0, 100)).toBe(100.0);
      expect(calculateFlatCost(0, 8.0, 0)).toBe(0.0);
    });

    test('handles fractional kWh and tariffs', () => {

      expect(calculateFlatCost(12.345, 7.5, 0)).toBe(92.59);
    });

    test('throws an error for negative kWh values', () => {
      expect(() => calculateFlatCost(-10, 8.0)).toThrow('kWh must be a non-negative number');
    });

    test('throws an error for invalid tariff values', () => {
      expect(() => calculateFlatCost(50, -5)).toThrow('Tariff must be a non-negative number');
    });
  });

  describe('calculateSlabCost', () => {
    const testSlabs = [
      { upTo: 100, rate: 4.0 },
      { upTo: 300, rate: 7.0 },
      { upTo: Infinity, rate: 10.0 },
    ];

    test('calculates cost within first slab', () => {
      const res = calculateSlabCost(50, testSlabs, 50);
      expect(res.energyCost).toBe(200.0);
      expect(res.fixedCharge).toBe(50.0);
      expect(res.totalCost).toBe(250.0);
      expect(res.breakdown).toHaveLength(1);
    });

    test('calculates cost spanning across multiple slabs', () => {

      const res = calculateSlabCost(250, testSlabs, 100);
      expect(res.energyCost).toBe(1450.0);
      expect(res.totalCost).toBe(1550.0);
      expect(res.breakdown).toHaveLength(2);
    });

    test('calculates cost spanning all three slabs', () => {

      const res = calculateSlabCost(400, testSlabs, 0);
      expect(res.energyCost).toBe(2800.0);
      expect(res.totalCost).toBe(2800.0);
      expect(res.breakdown).toHaveLength(3);
    });

    test('falls back gracefully when empty slabs array provided', () => {
      const res = calculateSlabCost(100, [], 50);
      expect(res.totalCost).toBe(850.0);
    });
  });

  describe('comparePeriodExpenses', () => {
    test('computes increase in consumption and cost', () => {
      const res = comparePeriodExpenses(300, 200, 8.0);
      expect(res.diffKwh).toBe(100);
      expect(res.diffCost).toBe(800.0);
      expect(res.percentChange).toBe(50.0);
      expect(res.isIncrease).toBe(true);
      expect(res.isDecrease).toBe(false);
    });

    test('computes decrease (savings) in consumption and cost', () => {
      const res = comparePeriodExpenses(150, 200, 8.0);
      expect(res.diffKwh).toBe(-50);
      expect(res.diffCost).toBe(-400.0);
      expect(res.percentChange).toBe(-25.0);
      expect(res.isDecrease).toBe(true);
    });

    test('handles zero previous period consumption without division by zero', () => {
      const res = comparePeriodExpenses(100, 0, 8.0);
      expect(res.percentChange).toBeNull();
      expect(res.diffCost).toBe(800.0);
    });
  });

  describe('estimateCarbonEmissions', () => {
    test('calculates emissions with default grid emission factor', () => {

      const res = estimateCarbonEmissions(1000, 0.82);
      expect(res.kgCO2).toBe(820.0);
      expect(res.metricTonsCO2).toBe(0.82);
    });

    test('handles custom emission factor', () => {

      const res = estimateCarbonEmissions(500, 0.45);
      expect(res.kgCO2).toBe(225.0);
      expect(res.metricTonsCO2).toBe(0.225);
    });

    test('throws for negative kWh', () => {
      expect(() => estimateCarbonEmissions(-50)).toThrow('kWh must be a non-negative number');
    });
  });
});

