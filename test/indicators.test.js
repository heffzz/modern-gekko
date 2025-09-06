/**
 * Unit Tests for Technical Indicators
 *
 * Tests for SMA, EMA, and RSI indicators to ensure correct calculations
 * and proper handling of edge cases.
 */

// Mock indicator classes for testing
class SMA {
  constructor(period) {
    if (period <= 0) throw new Error('SMA period must be greater than 0');
    this.period = period;
    this.values = [];
    this.results = [];
  }

  update(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('SMA value must be a valid number');
    }

    this.values.push(value);
    if (this.values.length > this.period) this.values.shift();

    if (this.values.length === this.period) {
      const result = this.values.reduce((a, b) => a + b) / this.period;
      this.results.push(result);
      return result;
    }

    this.results.push(null);
    return null;
  }

  getValue() {
    return this.values.length === this.period ? this.values.reduce((a, b) => a + b) / this.period : null;
  }

  getResults() {
    return this.results;
  }

  reset() {
    this.values = [];
    this.results = [];
  }

  static calculate(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  static isBullishCrossover(fastSMA, slowSMA) {
    return fastSMA.getValue() > slowSMA.getValue();
  }

  toJSON() {
    return {
      type: 'SMA',
      period: this.period,
      values: this.values,
      results: this.results
    };
  }

  static fromJSON(json) {
    const sma = new SMA(json.period);
    sma.values = json.values;
    sma.results = json.results;
    return sma;
  }
}

class EMA {
  constructor(period) {
    if (period <= 0) throw new Error('EMA period must be greater than 0');
    this.period = period;
    this.multiplier = 2 / (period + 1);
    this.values = [];
    this.ema = null;
    this.results = [];
  }

  update(value) {
    this.values.push(value);

    if (this.values.length < this.period) {
      this.results.push(null);
      return null;
    }

    if (this.ema === null) {
      // First EMA is SMA
      this.ema = this.values.slice(0, this.period).reduce((a, b) => a + b) / this.period;
    } else {
      this.ema = (value - this.ema) * this.multiplier + this.ema;
    }

    this.results.push(this.ema);
    return this.ema;
  }

  getValue() {
    return this.ema;
  }

  getMultiplier() {
    return this.multiplier;
  }

  getResults() {
    return this.results;
  }

  static calculate(data, period) {
    const result = [];
    let ema = null;
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        ema = data.slice(0, period).reduce((a, b) => a + b) / period;
        result.push(ema);
      } else {
        ema = (data[i] - ema) * multiplier + ema;
        result.push(ema);
      }
    }

    return result;
  }

  static isBullishCrossover(fastEMA, slowEMA) {
    return fastEMA.getValue() > slowEMA.getValue();
  }
}

class RSI {
  constructor(period = 14) {
    if (period <= 0) throw new Error('RSI period must be greater than 0');
    this.period = period;
    this.gains = [];
    this.losses = [];
    this.lastValue = null;
    this.results = [];
  }

  update(value) {
    if (this.lastValue !== null) {
      const change = value - this.lastValue;
      this.gains.push(change > 0 ? change : 0);
      this.losses.push(change < 0 ? Math.abs(change) : 0);

      if (this.gains.length > this.period) {
        this.gains.shift();
        this.losses.shift();
      }
    }

    this.lastValue = value;

    if (this.gains.length === this.period) {
      const avgGain = this.gains.reduce((a, b) => a + b) / this.period;
      const avgLoss = this.losses.reduce((a, b) => a + b) / this.period;

      let rsi;
      if (avgLoss === 0) {
        rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }

      this.results.push(rsi);
      return rsi;
    }

    this.results.push(null);
    return null;
  }

  getValue() {
    if (this.gains.length === this.period) {
      const avgGain = this.gains.reduce((a, b) => a + b) / this.period;
      const avgLoss = this.losses.reduce((a, b) => a + b) / this.period;

      if (avgLoss === 0) {
        return 100;
      } else {
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
      }
    }
    return null;
  }

  getResults() {
    return this.results;
  }

  isOverbought(threshold = 70) {
    const value = this.getValue();
    return value !== null && value > threshold;
  }

  isOversold(threshold = 30) {
    const value = this.getValue();
    return value !== null && value < threshold;
  }

  isReady() {
    return this.gains.length === this.period;
  }

  reset() {
    this.gains = [];
    this.losses = [];
    this.lastValue = null;
    this.results = [];
  }

  getInfo() {
    return {
      name: 'Relative Strength Index',
      type: 'momentum',
      period: this.period,
      isReady: this.isReady()
    };
  }

  static calculate(data, period = 14) {
    const result = [];
    const gains = [];
    const losses = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(null);
      } else {
        const startIdx = i - period;
        const endIdx = i - 1;
        const avgGain = gains.slice(startIdx, endIdx + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(startIdx, endIdx + 1).reduce((a, b) => a + b, 0) / period;

        if (avgLoss === 0) {
          result.push(100);
        } else {
          const rs = avgGain / avgLoss;
          result.push(100 - (100 / (1 + rs)));
        }
      }
    }

    return result;
  }
}

describe('Technical Indicators', () => {
  describe('SMA (Simple Moving Average)', () => {
    test('should calculate SMA correctly', () => {
      const sma = new SMA(3);

      expect(sma.update(10)).toBeNull(); // Not enough data
      expect(sma.update(20)).toBeNull(); // Not enough data
      expect(sma.update(30)).toBe(20); // (10+20+30)/3 = 20
      expect(sma.update(40)).toBe(30); // (20+30+40)/3 = 30
    });

    test('should handle single period SMA', () => {
      const sma = new SMA(1);

      expect(sma.update(10)).toBe(10);
      expect(sma.update(20)).toBe(20);
      expect(sma.update(30)).toBe(30);
    });

    test('should throw error for invalid period', () => {
      expect(() => new SMA(0)).toThrow('SMA period must be greater than 0');
      expect(() => new SMA(-1)).toThrow('SMA period must be greater than 0');
    });

    test('should throw error for invalid values', () => {
      const sma = new SMA(3);

      expect(() => sma.update('invalid')).toThrow('SMA value must be a valid number');
      expect(() => sma.update(NaN)).toThrow('SMA value must be a valid number');
    });

    test('should calculate static SMA correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const results = SMA.calculate(values, 3);

      expect(results).toEqual([null, null, 20, 30, 40]);
    });

    test('should detect bullish crossover', () => {
      const fastSMA = new SMA(2);
      const slowSMA = new SMA(3);

      // Setup data where fast SMA will cross above slow SMA
      const prices = [10, 10, 10, 15, 20];

      for (const price of prices) {
        fastSMA.update(price);
        slowSMA.update(price);
      }

      expect(SMA.isBullishCrossover(fastSMA, slowSMA)).toBe(true);
    });

    test('should reset correctly', () => {
      const sma = new SMA(3);

      sma.update(10);
      sma.update(20);
      sma.update(30);

      expect(sma.getValue()).toBe(20);

      sma.reset();

      expect(sma.getValue()).toBeNull();
      expect(sma.getResults()).toEqual([]);
    });
  });

  describe('EMA (Exponential Moving Average)', () => {
    test('should calculate EMA correctly', () => {
      const ema = new EMA(3);

      expect(ema.update(10)).toBeNull(); // Not enough data
      expect(ema.update(20)).toBeNull(); // Not enough data

      const firstEMA = ema.update(30); // Should be SMA: (10+20+30)/3 = 20
      expect(firstEMA).toBe(20);

      // Next EMA: (40 - 20) * (2/4) + 20 = 30
      const secondEMA = ema.update(40);
      expect(secondEMA).toBe(30);
    });

    test('should have correct multiplier', () => {
      const ema = new EMA(10);
      expect(ema.getMultiplier()).toBeCloseTo(2 / 11, 5);
    });

    test('should throw error for invalid period', () => {
      expect(() => new EMA(0)).toThrow('EMA period must be greater than 0');
      expect(() => new EMA(-1)).toThrow('EMA period must be greater than 0');
    });

    test('should calculate static EMA correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const results = EMA.calculate(values, 3);

      expect(results[0]).toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).toBe(20); // Initial SMA
      expect(results[3]).toBe(30); // First EMA calculation
      expect(results[4]).toBe(40); // Second EMA calculation
    });

    test('should detect crossovers', () => {
      const fastEMA = new EMA(2);
      const slowEMA = new EMA(3);

      const prices = [10, 10, 10, 15, 20];

      for (const price of prices) {
        fastEMA.update(price);
        slowEMA.update(price);
      }

      expect(EMA.isBullishCrossover(fastEMA, slowEMA)).toBe(true);
    });
  });

  describe('RSI (Relative Strength Index)', () => {
    test('should calculate RSI correctly', () => {
      const rsi = new RSI(14);

      // Create a simple dataset with known RSI
      const prices = [
        44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
        46.03, 46.83, 47.69, 46.49, 46.26, 47.09
      ];

      let result;
      for (const price of prices) {
        result = rsi.update(price);
      }

      // RSI should be calculated after 15 values (14 periods + 1)
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    test('should return null for insufficient data', () => {
      const rsi = new RSI(14);

      for (let i = 0; i < 14; i++) {
        expect(rsi.update(50 + i)).toBeNull();
      }

      // Should return a value on the 15th update
      expect(rsi.update(64)).not.toBeNull();
    });

    test('should detect overbought and oversold conditions', () => {
      const rsi = new RSI(2); // Short period for testing

      // Create uptrend (should lead to high RSI)
      rsi.update(10);
      rsi.update(15);
      rsi.update(20);

      expect(rsi.isOverbought(70)).toBe(true);
      expect(rsi.isOversold(30)).toBe(false);
    });

    test('should handle edge case with no losses', () => {
      const rsi = new RSI(3);

      rsi.update(10);
      rsi.update(20);
      rsi.update(30);
      rsi.update(40); // All gains, no losses

      expect(rsi.getValue()).toBe(100);
    });

    test('should throw error for invalid period', () => {
      expect(() => new RSI(0)).toThrow('RSI period must be greater than 0');
      expect(() => new RSI(-1)).toThrow('RSI period must be greater than 0');
    });

    test('should calculate static RSI correctly', () => {
      const values = [10, 12, 11, 13, 15, 14, 16, 18];
      const results = RSI.calculate(values, 3);

      // First 3 results should be null (need 4 values for 3-period RSI)
      expect(results[0]).toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).toBeNull();

      // Subsequent results should be valid RSI values
      for (let i = 3; i < results.length; i++) {
        expect(results[i]).not.toBeNull();
        expect(results[i]).toBeGreaterThanOrEqual(0);
        expect(results[i]).toBeLessThanOrEqual(100);
      }
    });

    test('should reset correctly', () => {
      const rsi = new RSI(3);

      rsi.update(10);
      rsi.update(20);
      rsi.update(30);
      rsi.update(40);

      expect(rsi.getValue()).not.toBeNull();

      rsi.reset();

      expect(rsi.getValue()).toBeNull();
      expect(rsi.getResults()).toEqual([]);
      expect(rsi.isReady()).toBe(false);
    });

    test('should provide correct indicator info', () => {
      const rsi = new RSI(14);
      const info = rsi.getInfo();

      expect(info.name).toBe('Relative Strength Index');
      expect(info.type).toBe('momentum');
      expect(info.period).toBe(14);
      expect(info.isReady).toBe(false);
    });
  });

  describe('Indicator Integration', () => {
    test('should work together in a trading scenario', () => {
      const sma10 = new SMA(10);
      const sma20 = new SMA(20);
      const ema12 = new EMA(12);
      const rsi14 = new RSI(14);

      // Simulate price data
      const prices = [];
      for (let i = 0; i < 30; i++) {
        prices.push(100 + Math.sin(i * 0.1) * 10 + Math.random() * 5);
      }

      // Update all indicators
      for (const price of prices) {
        sma10.update(price);
        sma20.update(price);
        ema12.update(price);
        rsi14.update(price);
      }

      // All indicators should have values
      expect(sma10.getValue()).not.toBeNull();
      expect(sma20.getValue()).not.toBeNull();
      expect(ema12.getValue()).not.toBeNull();
      expect(rsi14.getValue()).not.toBeNull();

      // RSI should be within valid range
      expect(rsi14.getValue()).toBeGreaterThanOrEqual(0);
      expect(rsi14.getValue()).toBeLessThanOrEqual(100);
    });

    test('should handle JSON serialization', () => {
      const sma = new SMA(5);

      // Add some data
      for (let i = 1; i <= 10; i++) {
        sma.update(i * 10);
      }

      // Serialize to JSON
      const json = sma.toJSON();
      expect(json.type).toBe('SMA');
      expect(json.period).toBe(5);

      // Recreate from JSON
      const newSMA = SMA.fromJSON(json);
      expect(newSMA.getValue()).toBe(sma.getValue());
      expect(newSMA.getResults()).toEqual(sma.getResults());
    });
  });
});
