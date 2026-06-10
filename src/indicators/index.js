/**
 * Technical Indicators Module
 *
 * This module exports all available technical indicators for the trading system.
 * Each indicator is implemented as a class with methods for updating values,
 * getting results, and performing calculations.
 */

const { SMA } = require('./SMA.js');
const { EMA } = require('./EMA.js');
const { RSI } = require('./RSI.js');
const { ADX } = require('./ADX.js');
const { ATR } = require('./ATR.js');
const { BollingerBands } = require('./BollingerBands.js');
const { CCI } = require('./CCI.js');
const { DEMA } = require('./DEMA.js');
const { Stochastic } = require('./Stochastic.js');
const { WilliamsR } = require('./WilliamsR.js');
const { ParabolicSAR } = require('./ParabolicSAR.js');
const { Ichimoku } = require('./Ichimoku.js');

/**
 * Create an indicator instance by name
 * @param {string} name - Indicator name (SMA, EMA, RSI)
 * @param {number} period - Indicator period
 * @returns {Object} Indicator instance
 */
function createIndicator(name, period) {
    const upperName = name.toUpperCase();

    switch (upperName) {
    case 'SMA':
      return new SMA(period);
    case 'EMA':
      return new EMA(period);
    case 'RSI':
      return new RSI(period);
    default:
      throw new Error(`Unknown indicator: ${name}`);
    }
}

/**
 * Get list of available indicators
 * @returns {Array} Array of indicator names
 */
function getAvailableIndicators() {
  return ['SMA', 'EMA', 'RSI'];
}

/**
 * Get indicator information
 * @param {string} name - Indicator name
 * @returns {Object} Indicator information
 */
function getIndicatorInfo(name) {
    const upperName = name.toUpperCase();

    const indicators = {
      SMA: {
        name: 'Simple Moving Average',
        type: 'trend',
        description: 'Average price over a specified number of periods',
        defaultPeriod: 20,
        minPeriod: 1,
        category: 'Moving Averages'
      },
      EMA: {
        name: 'Exponential Moving Average',
        type: 'trend',
        description: 'Weighted average that gives more importance to recent prices',
        defaultPeriod: 20,
        minPeriod: 1,
        category: 'Moving Averages'
      },
      RSI: {
        name: 'Relative Strength Index',
        type: 'momentum',
        description: 'Momentum oscillator that measures speed and magnitude of price changes',
        defaultPeriod: 14,
        minPeriod: 2,
        category: 'Momentum Oscillators',
        range: [0, 100],
        overbought: 70,
        oversold: 30
      }
    };

    return indicators[upperName] || null;
}

/**
 * Calculate multiple indicators for a dataset
 * @param {Array} data - Array of price values
 * @param {Object} config - Configuration object with indicator settings
 * @returns {Object} Object containing all calculated indicators
 */
function calculateIndicators(data, config = {}) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const results = {};

    // Default configuration
    const defaultConfig = {
      sma: { periods: [10, 20, 50] },
      ema: { periods: [12, 26] },
      rsi: { periods: [14] }
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Calculate SMAs
    if (finalConfig.sma && finalConfig.sma.periods) {
      results.sma = {};
      for (const period of finalConfig.sma.periods) {
        if (period <= data.length) {
          results.sma[period] = SMA.calculate(data, period);
        }
      }
    }

    // Calculate EMAs
    if (finalConfig.ema && finalConfig.ema.periods) {
      results.ema = {};
      for (const period of finalConfig.ema.periods) {
        if (period <= data.length) {
          results.ema[period] = EMA.calculate(data, period);
        }
      }
    }

    // Calculate RSIs
    if (finalConfig.rsi && finalConfig.rsi.periods) {
      results.rsi = {};
      for (const period of finalConfig.rsi.periods) {
        if (period < data.length) {
          results.rsi[period] = RSI.calculate(data, period);
        }
      }
    }

    return results;
}

/**
 * Validate indicator configuration
 * @param {string} name - Indicator name
 * @param {number} period - Indicator period
 * @param {Array} data - Data array (optional, for period validation)
 * @returns {boolean} True if valid
 */
function validateIndicatorConfig(name, period, data = null) {
  const info = getIndicatorInfo(name);

  if (!info) {
    return false;
  }

  if (typeof period !== 'number' || period < info.minPeriod) {
    return false;
  }

  if (data && Array.isArray(data)) {
    if (name.toUpperCase() === 'RSI' && period >= data.length) {
      return false;
    }
    if (name.toUpperCase() !== 'RSI' && period > data.length) {
      return false;
    }
  }

  return true;
}

// Export all indicator classes and functions
module.exports = {
  SMA,
  EMA,
  RSI,
  createIndicator,
  getAvailableIndicators,
  getIndicatorInfo,
  validateIndicatorConfig,
  calculateIndicators,
  ADX,
  ATR,
  BollingerBands,
  CCI,
  DEMA,
  Stochastic,
  WilliamsR,
  ParabolicSAR,
  Ichimoku
};
