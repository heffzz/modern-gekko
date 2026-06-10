/**
 * DEMA (Double Exponential Moving Average) Strategy
 * 
 * This strategy uses two DEMA indicators with different periods to generate
 * buy and sell signals. It's based on the crossover principle where:
 * - Buy signal: Fast DEMA crosses above Slow DEMA
 * - Sell signal: Fast DEMA crosses below Slow DEMA
 * 
 * DEMA is more responsive than regular EMA and reduces lag while maintaining smoothness.
 */

import BaseStrategy from './BaseStrategy.js';

export default class DEMAStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'DEMA Strategy';
    this.description = 'Double Exponential Moving Average crossover strategy with trend confirmation';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Trend Following';
    
    // Strategy state
    this.fastDEMA = null;
    this.slowDEMA = null;
    this.previousFastDEMA = null;
    this.previousSlowDEMA = null;
    this.trend = null; // 'up', 'down', or null
    this.consecutiveBars = 0;
    this.atr = null; // Average True Range for volatility filtering
    
    // Initialize DEMA-specific parameters
    this.initializeParameters();
  }

  initializeParameters() {
    // Call parent to get base risk management parameters
    super.initializeParameters();
    
    // DEMA-specific parameters
    this.defineParameter('fastPeriod', {
      label: 'Fast DEMA Period',
      description: 'Period for the fast Double Exponential Moving Average',
      type: 'number',
      default: 12,
      min: 2,
      max: 50,
      step: 1,
      category: 'DEMA Settings'
    });
    
    this.defineParameter('slowPeriod', {
      label: 'Slow DEMA Period',
      description: 'Period for the slow Double Exponential Moving Average',
      type: 'number',
      default: 26,
      min: 5,
      max: 100,
      step: 1,
      category: 'DEMA Settings',
      validation: (value) => {
        if (value <= this.parameters.fastPeriod) {
          return 'Slow period must be greater than fast period';
        }
        return true;
      }
    });
    
    this.defineParameter('confirmationBars', {
      label: 'Confirmation Bars',
      description: 'Number of consecutive bars to confirm trend before entry',
      type: 'number',
      default: 2,
      min: 1,
      max: 10,
      step: 1,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('minSpread', {
      label: 'Minimum Spread (%)',
      description: 'Minimum percentage difference between fast and slow DEMA for valid signal',
      type: 'number',
      default: 0.1,
      min: 0,
      max: 5,
      step: 0.01,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('trendFilter', {
      label: 'Enable Trend Filter',
      description: 'Only trade in the direction of the overall trend',
      type: 'boolean',
      default: true,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('volatilityFilter', {
      label: 'Volatility Filter',
      description: 'Filter signals based on market volatility',
      type: 'select',
      default: 'medium',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'low', label: 'Low Volatility Only' },
        { value: 'medium', label: 'Medium Volatility' },
        { value: 'high', label: 'High Volatility Only' }
      ],
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('tradingMode', {
      label: 'Trading Mode',
      description: 'Strategy trading approach',
      type: 'select',
      default: 'crossover',
      options: [
        { value: 'crossover', label: 'DEMA Crossover' },
        { value: 'divergence', label: 'Divergence Detection' }
      ],
      category: 'Strategy Mode'
    });
  }

  /**
   * Calculate Double Exponential Moving Average
   * @param {Array} prices - Array of price values
   * @param {number} period - DEMA period
   * @returns {number} DEMA value
   */
  calculateDEMA(prices, period) {
    if (prices.length < period * 2) {
      return null;
    }
    
    // Calculate first EMA
    const ema1 = this.calculateEMA(prices, period);
    if (!ema1) return null;
    
    // Calculate EMA of EMA (second smoothing)
    const ema2 = this.calculateEMA(ema1, period);
    if (!ema2) return null;
    
    // DEMA = 2 * EMA1 - EMA2
    const dema = 2 * ema1[ema1.length - 1] - ema2[ema2.length - 1];
    return dema;
  }

  /**
   * Calculate Exponential Moving Average
   * @param {Array} prices - Array of price values
   * @param {number} period - EMA period
   * @returns {Array} Array of EMA values
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
      const emaValue = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(emaValue);
    }
    
    return ema;
  }

  /**
   * Calculate market volatility using Average True Range
   * @param {Array} candles - Array of candle data
   * @param {number} period - ATR period
   * @returns {number} ATR value
   */
  calculateATR(candles, period = 14) {
    if (candles.length < period + 1) {
      return null;
    }
    
    const trueRanges = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate ATR as simple moving average of true ranges
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
  }

  /**
   * Check volatility filter condition
   * @param {Array} candles - Historical candles
   * @returns {boolean} Whether volatility condition is met
   */
  checkVolatilityFilter(candles) {
    if (this.parameters.volatilityFilter === 'off') {
      return true;
    }
    
    const atr = this.calculateATR(candles);
    if (!atr) return true;
    
    const currentPrice = candles[candles.length - 1].close;
    const volatilityPercent = (atr / currentPrice) * 100;
    
    switch (this.parameters.volatilityFilter) {
      case 'low':
        return volatilityPercent < 2;
      case 'medium':
        return volatilityPercent >= 1 && volatilityPercent <= 5;
      case 'high':
        return volatilityPercent > 3;
      default:
        return true;
    }
  }

  /**
   * Main strategy logic
   * @param {Object} candle - Current candle
   * @param {Array} historicalCandles - All historical candles
   * @param {Object} engine - Strategy engine
   * @returns {Object|null} Trading signal or null
   */
  async onCandle(candle, historicalCandles, engine) {
    if (!this.initialized) {
      throw new Error('Strategy not initialized');
    }
    
    // Need enough data for calculations
    if (historicalCandles.length < Math.max(this.parameters.fastPeriod, this.parameters.slowPeriod) * 3) {
      return null;
    }
    
    // Check risk management first
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Extract closing prices
    const closePrices = historicalCandles.map(c => c.close);
    
    // Calculate DEMA values
    this.previousFastDEMA = this.fastDEMA;
    this.previousSlowDEMA = this.slowDEMA;
    
    this.fastDEMA = this.calculateDEMA(closePrices, this.parameters.fastPeriod);
    this.slowDEMA = this.calculateDEMA(closePrices, this.parameters.slowPeriod);
    
    if (!this.fastDEMA || !this.slowDEMA || !this.previousFastDEMA || !this.previousSlowDEMA) {
      return null;
    }
    
    // Check volatility filter
    if (!this.checkVolatilityFilter(historicalCandles)) {
      return null;
    }
    
    // Determine current trend
    const currentTrend = this.fastDEMA > this.slowDEMA ? 'up' : 'down';
    const previousTrend = this.previousFastDEMA > this.previousSlowDEMA ? 'up' : 'down';
    
    // Check for trend change and update consecutive bars
    if (currentTrend === this.trend) {
      this.consecutiveBars++;
    } else {
      this.trend = currentTrend;
      this.consecutiveBars = 1;
    }
    
    // Calculate spread between DEMAs
    const spread = Math.abs(this.fastDEMA - this.slowDEMA);
    const spreadPercent = (spread / candle.close) * 100;
    
    // Check minimum spread requirement
    if (spreadPercent < this.parameters.minSpread) {
      return null;
    }
    
    // Entry signals
    if (!this.position) {
      // Bullish crossover: Fast DEMA crosses above Slow DEMA
      if (previousTrend === 'down' && currentTrend === 'up' && 
          this.consecutiveBars >= this.parameters.confirmationBars) {
        
        // Optional trend filter check
        if (this.parameters.trendFilter) {
          const longTermTrend = this.getLongTermTrend(historicalCandles);
          if (longTermTrend !== 'up') {
            return null;
          }
        }
        
        return this.createEntrySignal('long', candle.close, candle.timestamp, {
          reason: 'DEMA bullish crossover',
          fastDEMA: this.fastDEMA,
          slowDEMA: this.slowDEMA,
          spread: spreadPercent,
          consecutiveBars: this.consecutiveBars,
          confidence: Math.min(0.9, 0.5 + (spreadPercent / 2) + (this.consecutiveBars / 10))
        });
      }
    } else if (this.position === 'long') {
      // Exit on bearish crossover
      if (previousTrend === 'up' && currentTrend === 'down') {
        return this.createExitSignal('dema_crossover', candle.close, candle.timestamp, {
          reason: 'DEMA bearish crossover',
          fastDEMA: this.fastDEMA,
          slowDEMA: this.slowDEMA,
          spread: spreadPercent
        });
      }
    }
    
    return null;
  }

  /**
   * Determine long-term trend for trend filter
   * @param {Array} candles - Historical candles
   * @returns {string} 'up', 'down', or 'sideways'
   */
  getLongTermTrend(candles) {
    const longPeriod = Math.max(50, this.parameters.slowPeriod * 2);
    
    if (candles.length < longPeriod) {
      return 'sideways';
    }
    
    const closePrices = candles.map(c => c.close);
    const longTermDEMA = this.calculateDEMA(closePrices, longPeriod);
    
    if (!longTermDEMA) {
      return 'sideways';
    }
    
    const currentPrice = candles[candles.length - 1].close;
    const trendThreshold = 0.5; // 0.5% threshold
    
    if (currentPrice > longTermDEMA * (1 + trendThreshold / 100)) {
      return 'up';
    } else if (currentPrice < longTermDEMA * (1 - trendThreshold / 100)) {
      return 'down';
    }
    
    return 'sideways';
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.fastDEMA = null;
    this.slowDEMA = null;
    this.previousFastDEMA = null;
    this.previousSlowDEMA = null;
    this.trend = null;
    this.consecutiveBars = 0;
  }

  /**
   * Get current indicator values for debugging/display
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      fastDEMA: this.fastDEMA,
      slowDEMA: this.slowDEMA,
      trend: this.trend,
      consecutiveBars: this.consecutiveBars,
      position: this.position,
      entryPrice: this.entryPrice
    };
  }
}

// Named export for compatibility
export { DEMAStrategy };

// CommonJS export for compatibility with tests (Jest/babel). Guarded so the
// file can also be loaded as native ESM (e.g. the CLI backtester's dynamic
// import), where `module` is undefined.
if (typeof module !== 'undefined') {
  module.exports = DEMAStrategy;
}