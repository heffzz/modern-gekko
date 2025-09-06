/**
 * Simple Moving Average (SMA) Indicator
 *
 * The Simple Moving Average is calculated by adding the closing prices
 * of a security for a number of time periods and then dividing this total
 * by the number of time periods.
 */

export default class SMA {
  constructor(period = 20) {
    if (period <= 0) {
      throw new Error('SMA period must be greater than 0');
    }

    this.period = period;
    this.values = [];
    this.results = [];
  }

  /**
   * Add a new value and calculate SMA
   * @param {number} value - The value to add (typically closing price)
   * @returns {number|null} The SMA value or null if not enough data
   */
  update(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('SMA value must be a valid number');
    }

    this.values.push(value);

    // Keep only the values we need for the period
    if (this.values.length > this.period) {
      this.values.shift();
    }

    // Calculate SMA only if we have enough values
    if (this.values.length === this.period) {
      const sum = this.values.reduce((acc, val) => acc + val, 0);
      const sma = sum / this.period;
      this.results.push(sma);
      return sma;
    }

    this.results.push(null);
    return null;
  }

  /**
   * Get the current SMA value
   * @returns {number|null} The current SMA value or null
   */
  getValue() {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }

  /**
   * Get all SMA results
   * @returns {Array} Array of SMA values (null for insufficient data)
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Get the last N SMA values
   * @param {number} count - Number of values to return
   * @returns {Array} Array of the last N SMA values
   */
  getLastValues(count) {
    if (count <= 0) {
      return [];
    }
    return this.results.slice(-count);
  }

  /**
   * Check if SMA is ready (has enough data)
   * @returns {boolean} True if SMA can be calculated
   */
  isReady() {
    return this.values.length >= this.period;
  }

  /**
   * Get the number of values processed
   * @returns {number} Number of values processed
   */
  getCount() {
    return this.results.length;
  }

  /**
   * Reset the indicator
   */
  reset() {
    this.values = [];
    this.results = [];
  }

  /**
   * Calculate SMA for an array of values
   * @param {Array} values - Array of values
   * @param {number} period - SMA period
   * @returns {Array} Array of SMA values
   */
  static calculate(values, period) {
    if (!Array.isArray(values)) {
      throw new Error('Values must be an array');
    }

    if (period <= 0 || period > values.length) {
      throw new Error('Invalid period for SMA calculation');
    }

    const sma = new SMA(period);
    const results = [];

    for (const value of values) {
      results.push(sma.update(value));
    }

    return results;
  }

  /**
   * Calculate SMA for the last N periods of an array
   * @param {Array} values - Array of values
   * @param {number} period - SMA period
   * @returns {number|null} SMA value or null
   */
  static calculateLast(values, period) {
    if (!Array.isArray(values) || values.length < period) {
      return null;
    }

    const lastValues = values.slice(-period);
    const sum = lastValues.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  /**
   * Check if there's a bullish crossover (current SMA > previous SMA)
   * @param {SMA} fastSMA - Fast SMA indicator
   * @param {SMA} slowSMA - Slow SMA indicator
   * @returns {boolean} True if bullish crossover occurred
   */
  static isBullishCrossover(fastSMA, slowSMA) {
    const fastResults = fastSMA.getResults();
    const slowResults = slowSMA.getResults();

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
   * Check if there's a bearish crossover (current SMA < previous SMA)
   * @param {SMA} fastSMA - Fast SMA indicator
   * @param {SMA} slowSMA - Slow SMA indicator
   * @returns {boolean} True if bearish crossover occurred
   */
  static isBearishCrossover(fastSMA, slowSMA) {
    const fastResults = fastSMA.getResults();
    const slowResults = slowSMA.getResults();

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
   * Get indicator information
   * @returns {Object} Indicator info
   */
  getInfo() {
    return {
      name: 'Simple Moving Average',
      type: 'trend',
      period: this.period,
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
      type: 'SMA',
      period: this.period,
      values: this.values,
      results: this.results
    };
  }

  /**
   * Create SMA from JSON
   * @param {Object} json - JSON representation
   * @returns {SMA} SMA instance
   */
  static fromJSON(json) {
    const sma = new SMA(json.period);
    sma.values = [...json.values];
    sma.results = [...json.results];
    return sma;
  }
}

// Named export for compatibility
export { SMA };
