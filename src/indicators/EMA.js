/**
 * Exponential Moving Average (EMA) Indicator
 *
 * The Exponential Moving Average gives more weight to recent prices
 * and reacts more quickly to price changes than the Simple Moving Average.
 *
 * Formula: EMA = (Close - EMA_previous) * multiplier + EMA_previous
 * Where multiplier = 2 / (period + 1)
 */

export default class EMA {
  constructor(period = 20) {
    if (period <= 0) {
      throw new Error('EMA period must be greater than 0');
    }

    this.period = period;
    this.multiplier = 2 / (period + 1);
    this.values = [];
    this.results = [];
    this.ema = null;
    this.initialized = false;
  }

  /**
   * Add a new value and calculate EMA
   * @param {number} value - The value to add (typically closing price)
   * @returns {number|null} The EMA value or null if not enough data
   */
  update(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('EMA value must be a valid number');
    }

    this.values.push(value);

    if (!this.initialized) {
      // For the first calculation, we need enough values to calculate initial SMA
      if (this.values.length === this.period) {
        // Initialize EMA with SMA of first 'period' values
        const sum = this.values.reduce((acc, val) => acc + val, 0);
        this.ema = sum / this.period;
        this.results.push(this.ema);
        this.initialized = true;
        return this.ema;
      } else {
        this.results.push(null);
        return null;
      }
    } else {
      // Calculate EMA using the formula
      this.ema = (value - this.ema) * this.multiplier + this.ema;
      this.results.push(this.ema);
      return this.ema;
    }
  }

  /**
   * Get the current EMA value
   * @returns {number|null} The current EMA value or null
   */
  getValue() {
    return this.ema;
  }

  /**
   * Get all EMA results
   * @returns {Array} Array of EMA values (null for insufficient data)
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Get the last N EMA values
   * @param {number} count - Number of values to return
   * @returns {Array} Array of the last N EMA values
   */
  getLastValues(count) {
    if (count <= 0) {
      return [];
    }
    return this.results.slice(-count);
  }

  /**
   * Check if EMA is ready (has enough data)
   * @returns {boolean} True if EMA can be calculated
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Get the number of values processed
   * @returns {number} Number of values processed
   */
  getCount() {
    return this.results.length;
  }

  /**
   * Get the smoothing factor (multiplier)
   * @returns {number} The smoothing factor
   */
  getMultiplier() {
    return this.multiplier;
  }

  /**
   * Reset the indicator
   */
  reset() {
    this.values = [];
    this.results = [];
    this.ema = null;
    this.initialized = false;
  }

  /**
   * Calculate EMA for an array of values
   * @param {Array} values - Array of values
   * @param {number} period - EMA period
   * @returns {Array} Array of EMA values
   */
  static calculate(values, period) {
    if (!Array.isArray(values)) {
      throw new Error('Values must be an array');
    }

    if (period <= 0 || period > values.length) {
      throw new Error('Invalid period for EMA calculation');
    }

    const ema = new EMA(period);
    const results = [];

    for (const value of values) {
      results.push(ema.update(value));
    }

    return results;
  }

  /**
   * Calculate EMA for the last value given historical data
   * @param {Array} values - Array of values
   * @param {number} period - EMA period
   * @returns {number|null} EMA value or null
   */
  static calculateLast(values, period) {
    if (!Array.isArray(values) || values.length < period) {
      return null;
    }

    const ema = new EMA(period);
    let result = null;

    for (const value of values) {
      result = ema.update(value);
    }

    return result;
  }

  /**
   * Check if there's a bullish crossover (current EMA > previous EMA)
   * @param {EMA} fastEMA - Fast EMA indicator
   * @param {EMA} slowEMA - Slow EMA indicator
   * @returns {boolean} True if bullish crossover occurred
   */
  static isBullishCrossover(fastEMA, slowEMA) {
    const fastResults = fastEMA.getResults();
    const slowResults = slowEMA.getResults();

    if (fastResults.length < 2 || slowResults.length < 2) {
      return false;
    }

    const fastCurrent = fastResults[fastResults.length - 1];
    const fastPrevious = fastResults[fastResults.length - 2];
    const slowCurrent = slowResults[slowResults.length - 1];
    const slowPrevious = slowResults[slowResults.length - 2];

    if (fastCurrent === null || fastPrevious === null ||
        slowCurrent === null || slowPrevious === null) {
      return false;
    }

    return fastPrevious <= slowPrevious && fastCurrent > slowCurrent;
  }

  /**
   * Check if there's a bearish crossover (current EMA < previous EMA)
   * @param {EMA} fastEMA - Fast EMA indicator
   * @param {EMA} slowEMA - Slow EMA indicator
   * @returns {boolean} True if bearish crossover occurred
   */
  static isBearishCrossover(fastEMA, slowEMA) {
    const fastResults = fastEMA.getResults();
    const slowResults = slowEMA.getResults();

    if (fastResults.length < 2 || slowResults.length < 2) {
      return false;
    }

    const fastCurrent = fastResults[fastResults.length - 1];
    const fastPrevious = fastResults[fastResults.length - 2];
    const slowCurrent = slowResults[slowResults.length - 1];
    const slowPrevious = slowResults[slowResults.length - 2];

    if (fastCurrent === null || fastPrevious === null ||
        slowCurrent === null || slowPrevious === null) {
      return false;
    }

    return fastPrevious >= slowPrevious && fastCurrent < slowCurrent;
  }

  /**
   * Calculate the difference between two EMAs
   * @param {EMA} ema1 - First EMA
   * @param {EMA} ema2 - Second EMA
   * @returns {number|null} Difference or null
   */
  static getDifference(ema1, ema2) {
    const value1 = ema1.getValue();
    const value2 = ema2.getValue();

    if (value1 === null || value2 === null) {
      return null;
    }

    return value1 - value2;
  }

  /**
   * Calculate the percentage difference between two EMAs
   * @param {EMA} ema1 - First EMA
   * @param {EMA} ema2 - Second EMA
   * @returns {number|null} Percentage difference or null
   */
  static getPercentageDifference(ema1, ema2) {
    const value1 = ema1.getValue();
    const value2 = ema2.getValue();

    if (value1 === null || value2 === null || value2 === 0) {
      return null;
    }

    return ((value1 - value2) / value2) * 100;
  }

  /**
   * Get indicator information
   * @returns {Object} Indicator info
   */
  getInfo() {
    return {
      name: 'Exponential Moving Average',
      type: 'trend',
      period: this.period,
      multiplier: this.multiplier,
      isReady: this.isReady(),
      currentValue: this.getValue(),
      valuesCount: this.getCount()
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      type: 'EMA',
      period: this.period,
      multiplier: this.multiplier,
      values: this.values,
      results: this.results,
      ema: this.ema,
      initialized: this.initialized
    };
  }

  /**
   * Create EMA from JSON
   * @param {Object} json - JSON representation
   * @returns {EMA} EMA instance
   */
  static fromJSON(json) {
    const ema = new EMA(json.period);
    ema.values = [...json.values];
    ema.results = [...json.results];
    ema.ema = json.ema;
    ema.initialized = json.initialized;
    return ema;
  }
}

// Named export for compatibility
export { EMA };
