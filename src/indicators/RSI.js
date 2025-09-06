/**
 * Relative Strength Index (RSI) Indicator
 *
 * RSI is a momentum oscillator that measures the speed and magnitude
 * of price changes. RSI oscillates between 0 and 100.
 *
 * Traditionally:
 * - RSI above 70 indicates overbought conditions
 * - RSI below 30 indicates oversold conditions
 *
 * Formula:
 * RS = Average Gain / Average Loss
 * RSI = 100 - (100 / (1 + RS))
 */

export default class RSI {
  constructor(period = 14) {
    if (period <= 0) {
      throw new Error('RSI period must be greater than 0');
    }

    this.period = period;
    this.values = [];
    this.gains = [];
    this.losses = [];
    this.results = [];
    this.avgGain = null;
    this.avgLoss = null;
    this.initialized = false;
  }

  /**
   * Add a new value and calculate RSI
   * @param {number} value - The value to add (typically closing price)
   * @returns {number|null} The RSI value or null if not enough data
   */
  update(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('RSI value must be a valid number');
    }

    this.values.push(value);

    // Need at least 2 values to calculate price change
    if (this.values.length < 2) {
      this.results.push(null);
      return null;
    }

    // Calculate price change
    const currentValue = this.values[this.values.length - 1];
    const previousValue = this.values[this.values.length - 2];
    const change = currentValue - previousValue;

    // Separate gains and losses
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    this.gains.push(gain);
    this.losses.push(loss);

    // Need enough data points to calculate RSI
    if (this.gains.length < this.period) {
      this.results.push(null);
      return null;
    }

    if (!this.initialized) {
      // Initial calculation using simple average
      const sumGains = this.gains.slice(-this.period).reduce((sum, gain) => sum + gain, 0);
      const sumLosses = this.losses.slice(-this.period).reduce((sum, loss) => sum + loss, 0);

      this.avgGain = sumGains / this.period;
      this.avgLoss = sumLosses / this.period;
      this.initialized = true;
    } else {
      // Subsequent calculations using smoothed averages (Wilder's smoothing)
      this.avgGain = ((this.avgGain * (this.period - 1)) + gain) / this.period;
      this.avgLoss = ((this.avgLoss * (this.period - 1)) + loss) / this.period;
    }

    // Calculate RSI
    let rsi;
    if (this.avgLoss === 0) {
      rsi = 100; // No losses means RSI = 100
    } else {
      const rs = this.avgGain / this.avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }

    this.results.push(rsi);
    return rsi;
  }

  /**
   * Get the current RSI value
   * @returns {number|null} The current RSI value or null
   */
  getValue() {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }

  /**
   * Get all RSI results
   * @returns {Array} Array of RSI values (null for insufficient data)
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Get the last N RSI values
   * @param {number} count - Number of values to return
   * @returns {Array} Array of the last N RSI values
   */
  getLastValues(count) {
    if (count <= 0) {
      return [];
    }
    return this.results.slice(-count);
  }

  /**
   * Check if RSI is ready (has enough data)
   * @returns {boolean} True if RSI can be calculated
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
   * Check if RSI indicates overbought condition
   * @param {number} threshold - Overbought threshold (default: 70)
   * @returns {boolean} True if overbought
   */
  isOverbought(threshold = 70) {
    const currentRSI = this.getValue();
    return currentRSI !== null && currentRSI > threshold;
  }

  /**
   * Check if RSI indicates oversold condition
   * @param {number} threshold - Oversold threshold (default: 30)
   * @returns {boolean} True if oversold
   */
  isOversold(threshold = 30) {
    const currentRSI = this.getValue();
    return currentRSI !== null && currentRSI < threshold;
  }

  /**
   * Check for bullish divergence (price makes lower low, RSI makes higher low)
   * @param {Array} prices - Array of price values
   * @param {number} lookback - Number of periods to look back
   * @returns {boolean} True if bullish divergence detected
   */
  isBullishDivergence(prices, lookback = 5) {
    if (this.results.length < lookback || prices.length < lookback) {
      return false;
    }

    const recentPrices = prices.slice(-lookback);
    const recentRSI = this.results.slice(-lookback);

    // Find the lowest price and its corresponding RSI
    let minPriceIndex = 0;
    let minPrice = recentPrices[0];

    for (let i = 1; i < recentPrices.length; i++) {
      if (recentPrices[i] < minPrice) {
        minPrice = recentPrices[i];
        minPriceIndex = i;
      }
    }

    // Check if current price is higher than the lowest price
    // and current RSI is higher than RSI at the lowest price
    const currentPrice = recentPrices[recentPrices.length - 1];
    const currentRSI = recentRSI[recentRSI.length - 1];
    const minRSI = recentRSI[minPriceIndex];

    return currentPrice > minPrice && currentRSI > minRSI;
  }

  /**
   * Check for bearish divergence (price makes higher high, RSI makes lower high)
   * @param {Array} prices - Array of price values
   * @param {number} lookback - Number of periods to look back
   * @returns {boolean} True if bearish divergence detected
   */
  isBearishDivergence(prices, lookback = 5) {
    if (this.results.length < lookback || prices.length < lookback) {
      return false;
    }

    const recentPrices = prices.slice(-lookback);
    const recentRSI = this.results.slice(-lookback);

    // Find the highest price and its corresponding RSI
    let maxPriceIndex = 0;
    let maxPrice = recentPrices[0];

    for (let i = 1; i < recentPrices.length; i++) {
      if (recentPrices[i] > maxPrice) {
        maxPrice = recentPrices[i];
        maxPriceIndex = i;
      }
    }

    // Check if current price is lower than the highest price
    // and current RSI is lower than RSI at the highest price
    const currentPrice = recentPrices[recentPrices.length - 1];
    const currentRSI = recentRSI[recentRSI.length - 1];
    const maxRSI = recentRSI[maxPriceIndex];

    return currentPrice < maxPrice && currentRSI < maxRSI;
  }

  /**
   * Reset the indicator
   */
  reset() {
    this.values = [];
    this.gains = [];
    this.losses = [];
    this.results = [];
    this.avgGain = null;
    this.avgLoss = null;
    this.initialized = false;
  }

  /**
   * Calculate RSI for an array of values
   * @param {Array} values - Array of values
   * @param {number} period - RSI period
   * @returns {Array} Array of RSI values
   */
  static calculate(values, period) {
    if (!Array.isArray(values)) {
      throw new Error('Values must be an array');
    }

    if (period <= 0 || period >= values.length) {
      throw new Error('Invalid period for RSI calculation');
    }

    const rsi = new RSI(period);
    const results = [];

    for (const value of values) {
      results.push(rsi.update(value));
    }

    return results;
  }

  /**
   * Calculate RSI for the last value given historical data
   * @param {Array} values - Array of values
   * @param {number} period - RSI period
   * @returns {number|null} RSI value or null
   */
  static calculateLast(values, period) {
    if (!Array.isArray(values) || values.length <= period) {
      return null;
    }

    const rsi = new RSI(period);
    let result = null;

    for (const value of values) {
      result = rsi.update(value);
    }

    return result;
  }

  /**
   * Get current average gain
   * @returns {number|null} Average gain or null
   */
  getAverageGain() {
    return this.avgGain;
  }

  /**
   * Get current average loss
   * @returns {number|null} Average loss or null
   */
  getAverageLoss() {
    return this.avgLoss;
  }

  /**
   * Get current RS (Relative Strength) value
   * @returns {number|null} RS value or null
   */
  getRS() {
    if (this.avgGain === null || this.avgLoss === null || this.avgLoss === 0) {
      return null;
    }
    return this.avgGain / this.avgLoss;
  }

  /**
   * Get indicator information
   * @returns {Object} Indicator info
   */
  getInfo() {
    return {
      name: 'Relative Strength Index',
      type: 'momentum',
      period: this.period,
      isReady: this.isReady(),
      currentValue: this.getValue(),
      valuesCount: this.getCount(),
      avgGain: this.avgGain,
      avgLoss: this.avgLoss,
      rs: this.getRS()
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      type: 'RSI',
      period: this.period,
      values: this.values,
      gains: this.gains,
      losses: this.losses,
      results: this.results,
      avgGain: this.avgGain,
      avgLoss: this.avgLoss,
      initialized: this.initialized
    };
  }

  /**
   * Create RSI from JSON
   * @param {Object} json - JSON representation
   * @returns {RSI} RSI instance
   */
  static fromJSON(json) {
    const rsi = new RSI(json.period);
    rsi.values = [...json.values];
    rsi.gains = [...json.gains];
    rsi.losses = [...json.losses];
    rsi.results = [...json.results];
    rsi.avgGain = json.avgGain;
    rsi.avgLoss = json.avgLoss;
    rsi.initialized = json.initialized;
    return rsi;
  }
}

// Named export for compatibility
export { RSI };
