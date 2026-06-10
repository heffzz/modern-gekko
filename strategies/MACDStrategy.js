/**
 * MACD (Moving Average Convergence Divergence) Strategy
 * 
 * This strategy uses the MACD indicator to generate trading signals:
 * - MACD Line: 12-period EMA - 26-period EMA
 * - Signal Line: 9-period EMA of MACD Line
 * - Histogram: MACD Line - Signal Line
 * 
 * Trading signals:
 * - Buy: MACD line crosses above signal line (bullish crossover)
 * - Sell: MACD line crosses below signal line (bearish crossover)
 * - Additional confirmation from histogram and zero line crossovers
 */

import BaseStrategy from './BaseStrategy.js';

export default class MACDStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'MACD Strategy';
    this.description = 'Moving Average Convergence Divergence strategy with multiple confirmation signals';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Momentum';
    
    // MACD state
    this.macdLine = null;
    this.signalLine = null;
    this.histogram = null;
    this.previousMacdLine = null;
    this.previousSignalLine = null;
    this.previousHistogram = null;
    
    // Trend state
    this.macdTrend = null;
    this.signalConfirmations = 0;
    this.lastCrossover = null;
    
    this.initializeParameters();
  }

  initializeParameters() {
    super.initializeParameters();
    
    // MACD calculation parameters
    this.defineParameter('fastPeriod', {
      label: 'Fast EMA Period',
      description: 'Period for the fast EMA in MACD calculation',
      type: 'number',
      default: 12,
      min: 5,
      max: 30,
      step: 1,
      category: 'MACD Settings'
    });
    
    this.defineParameter('slowPeriod', {
      label: 'Slow EMA Period',
      description: 'Period for the slow EMA in MACD calculation',
      type: 'number',
      default: 26,
      min: 15,
      max: 50,
      step: 1,
      category: 'MACD Settings',
      validation: (value) => {
        if (value <= this.parameters.fastPeriod) {
          return 'Slow period must be greater than fast period';
        }
        return true;
      }
    });
    
    this.defineParameter('signalPeriod', {
      label: 'Signal Line Period',
      description: 'Period for the signal line EMA',
      type: 'number',
      default: 9,
      min: 3,
      max: 20,
      step: 1,
      category: 'MACD Settings'
    });
    
    // Signal confirmation parameters
    this.defineParameter('requireZeroCross', {
      label: 'Require Zero Line Cross',
      description: 'Only trade when MACD line crosses zero line',
      type: 'boolean',
      default: false,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('histogramConfirmation', {
      label: 'Histogram Confirmation',
      description: 'Require histogram to confirm signal direction',
      type: 'boolean',
      default: true,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('minHistogramValue', {
      label: 'Min Histogram Value',
      description: 'Minimum absolute histogram value for valid signal',
      type: 'number',
      default: 0.001,
      min: 0,
      max: 0.01,
      step: 0.0001,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('divergenceDetection', {
      label: 'Enable Divergence Detection',
      description: 'Detect bullish/bearish divergences for additional signals',
      type: 'boolean',
      default: false,
      category: 'Advanced Features'
    });
    
    this.defineParameter('trendStrengthFilter', {
      label: 'Trend Strength Filter',
      description: 'Filter signals based on trend strength',
      type: 'select',
      default: 'medium',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'weak', label: 'Weak Trends Only' },
        { value: 'medium', label: 'Medium Strength' },
        { value: 'strong', label: 'Strong Trends Only' }
      ],
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('cooldownPeriod', {
      label: 'Signal Cooldown (bars)',
      description: 'Minimum bars between signals to avoid whipsaws',
      type: 'number',
      default: 5,
      min: 0,
      max: 20,
      step: 1,
      category: 'Signal Confirmation'
    });
  }

  /**
   * Calculate Exponential Moving Average
   * @param {Array} prices - Price array
   * @param {number} period - EMA period
   * @returns {Array} EMA values
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      const emaValue = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(emaValue);
    }
    
    return ema;
  }

  /**
   * Calculate MACD components
   * @param {Array} prices - Price array
   * @returns {Object} MACD components
   */
  calculateMACD(prices) {
    const fastEMA = this.calculateEMA(prices, this.parameters.fastPeriod);
    const slowEMA = this.calculateEMA(prices, this.parameters.slowPeriod);
    
    if (!fastEMA || !slowEMA) {
      return null;
    }
    
    // Calculate MACD line
    const macdLine = [];
    const startIndex = slowEMA.length - fastEMA.length;
    
    for (let i = 0; i < fastEMA.length - startIndex; i++) {
      macdLine.push(fastEMA[i + startIndex] - slowEMA[i + startIndex]);
    }
    
    if (macdLine.length === 0) {
      return null;
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, this.parameters.signalPeriod);
    
    if (!signalLine) {
      return null;
    }
    
    // Calculate histogram
    const histogram = [];
    const histogramStartIndex = macdLine.length - signalLine.length;
    
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + histogramStartIndex] - signalLine[i]);
    }
    
    return {
      macdLine: macdLine[macdLine.length - 1],
      signalLine: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1],
      macdArray: macdLine,
      signalArray: signalLine,
      histogramArray: histogram
    };
  }

  /**
   * Check trend strength based on MACD characteristics
   * @param {Array} macdArray - MACD line history
   * @param {Array} histogramArray - Histogram history
   * @returns {string} Trend strength: 'weak', 'medium', 'strong'
   */
  checkTrendStrength(macdArray, histogramArray) {
    if (!macdArray || !histogramArray || macdArray.length < 10) {
      return 'weak';
    }
    
    const recentMACD = macdArray.slice(-10);
    const recentHistogram = histogramArray.slice(-5);
    
    // Check MACD line momentum
    const macdMomentum = Math.abs(recentMACD[recentMACD.length - 1] - recentMACD[0]);
    
    // Check histogram consistency
    const histogramConsistency = recentHistogram.every(h => h > 0) || recentHistogram.every(h => h < 0);
    
    // Check MACD distance from zero
    const macdDistance = Math.abs(this.macdLine);
    
    if (macdMomentum > 0.01 && histogramConsistency && macdDistance > 0.005) {
      return 'strong';
    } else if (macdMomentum > 0.005 || histogramConsistency) {
      return 'medium';
    }
    
    return 'weak';
  }

  /**
   * Detect divergences between price and MACD
   * @param {Array} candles - Historical candles
   * @param {Array} macdArray - MACD line history
   * @returns {Object|null} Divergence information
   */
  detectDivergence(candles, macdArray) {
    if (!this.parameters.divergenceDetection || candles.length < 20 || macdArray.length < 20) {
      return null;
    }
    
    const recentCandles = candles.slice(-20);
    const recentMACD = macdArray.slice(-20);
    
    // Find recent highs and lows
    const priceHighs = [];
    const priceLows = [];
    const macdHighs = [];
    const macdLows = [];
    
    for (let i = 1; i < recentCandles.length - 1; i++) {
      const current = recentCandles[i];
      const prev = recentCandles[i - 1];
      const next = recentCandles[i + 1];
      
      // Price peaks
      if (current.high > prev.high && current.high > next.high) {
        priceHighs.push({ index: i, value: current.high });
      }
      
      // Price troughs
      if (current.low < prev.low && current.low < next.low) {
        priceLows.push({ index: i, value: current.low });
      }
      
      // MACD peaks
      if (recentMACD[i] > recentMACD[i - 1] && recentMACD[i] > recentMACD[i + 1]) {
        macdHighs.push({ index: i, value: recentMACD[i] });
      }
      
      // MACD troughs
      if (recentMACD[i] < recentMACD[i - 1] && recentMACD[i] < recentMACD[i + 1]) {
        macdLows.push({ index: i, value: recentMACD[i] });
      }
    }
    
    // Check for bullish divergence (price makes lower low, MACD makes higher low)
    if (priceLows.length >= 2 && macdLows.length >= 2) {
      const lastPriceLow = priceLows[priceLows.length - 1];
      const prevPriceLow = priceLows[priceLows.length - 2];
      const lastMacdLow = macdLows[macdLows.length - 1];
      const prevMacdLow = macdLows[macdLows.length - 2];
      
      if (lastPriceLow.value < prevPriceLow.value && lastMacdLow.value > prevMacdLow.value) {
        return { type: 'bullish', strength: 'medium' };
      }
    }
    
    // Check for bearish divergence (price makes higher high, MACD makes lower high)
    if (priceHighs.length >= 2 && macdHighs.length >= 2) {
      const lastPriceHigh = priceHighs[priceHighs.length - 1];
      const prevPriceHigh = priceHighs[priceHighs.length - 2];
      const lastMacdHigh = macdHighs[macdHighs.length - 1];
      const prevMacdHigh = macdHighs[macdHighs.length - 2];
      
      if (lastPriceHigh.value > prevPriceHigh.value && lastMacdHigh.value < prevMacdHigh.value) {
        return { type: 'bearish', strength: 'medium' };
      }
    }
    
    return null;
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
    
    // Need enough data
    const requiredBars = Math.max(this.parameters.slowPeriod + this.parameters.signalPeriod, 50);
    if (historicalCandles.length < requiredBars) {
      return null;
    }
    
    // Check risk management
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Calculate MACD
    const closePrices = historicalCandles.map(c => c.close);
    const macdData = this.calculateMACD(closePrices);
    
    if (!macdData) {
      return null;
    }
    
    // Store previous values
    this.previousMacdLine = this.macdLine;
    this.previousSignalLine = this.signalLine;
    this.previousHistogram = this.histogram;
    
    // Update current values
    this.macdLine = macdData.macdLine;
    this.signalLine = macdData.signalLine;
    this.histogram = macdData.histogram;
    
    if (this.previousMacdLine === null || this.previousSignalLine === null) {
      return null;
    }
    
    // Check cooldown period
    if (this.lastCrossover && 
        (candle.timestamp - this.lastCrossover) < (this.parameters.cooldownPeriod * 60000)) {
      return null;
    }
    
    // Check trend strength filter
    const trendStrength = this.checkTrendStrength(macdData.macdArray, macdData.histogramArray);
    if (this.parameters.trendStrengthFilter !== 'off' && 
        this.parameters.trendStrengthFilter !== trendStrength) {
      return null;
    }
    
    // Detect divergences
    const divergence = this.detectDivergence(historicalCandles, macdData.macdArray);
    
    // Entry signals
    if (!this.position) {
      // Bullish crossover: MACD crosses above signal line
      if (this.previousMacdLine <= this.previousSignalLine && 
          this.macdLine > this.signalLine) {
        
        // Check zero line requirement
        if (this.parameters.requireZeroCross && this.macdLine <= 0) {
          return null;
        }
        
        // Check histogram confirmation
        if (this.parameters.histogramConfirmation && 
            (this.histogram <= 0 || Math.abs(this.histogram) < this.parameters.minHistogramValue)) {
          return null;
        }
        
        this.lastCrossover = candle.timestamp;
        
        const confidence = this.calculateSignalConfidence('bullish', trendStrength, divergence);
        
        return this.createEntrySignal('long', candle.close, candle.timestamp, {
          reason: 'MACD bullish crossover',
          macdLine: this.macdLine,
          signalLine: this.signalLine,
          histogram: this.histogram,
          trendStrength,
          divergence,
          confidence
        });
      }
      
      // Divergence-based entry
      if (divergence && divergence.type === 'bullish' && this.macdLine > this.signalLine) {
        this.lastCrossover = candle.timestamp;
        
        return this.createEntrySignal('long', candle.close, candle.timestamp, {
          reason: 'Bullish divergence',
          macdLine: this.macdLine,
          signalLine: this.signalLine,
          histogram: this.histogram,
          divergence,
          confidence: 0.7
        });
      }
    } else if (this.position === 'long') {
      // Bearish crossover: MACD crosses below signal line
      if (this.previousMacdLine >= this.previousSignalLine && 
          this.macdLine < this.signalLine) {
        
        this.lastCrossover = candle.timestamp;
        
        return this.createExitSignal('macd_crossover', candle.close, candle.timestamp, {
          reason: 'MACD bearish crossover',
          macdLine: this.macdLine,
          signalLine: this.signalLine,
          histogram: this.histogram
        });
      }
      
      // Divergence-based exit
      if (divergence && divergence.type === 'bearish') {
        return this.createExitSignal('bearish_divergence', candle.close, candle.timestamp, {
          reason: 'Bearish divergence detected',
          macdLine: this.macdLine,
          signalLine: this.signalLine,
          divergence
        });
      }
    }
    
    return null;
  }

  /**
   * Calculate signal confidence based on multiple factors
   * @param {string} direction - Signal direction
   * @param {string} trendStrength - Trend strength
   * @param {Object} divergence - Divergence data
   * @returns {number} Confidence score (0-1)
   */
  calculateSignalConfidence(direction, trendStrength, divergence) {
    let confidence = 0.5;
    
    // Trend strength bonus
    switch (trendStrength) {
      case 'strong':
        confidence += 0.3;
        break;
      case 'medium':
        confidence += 0.15;
        break;
      case 'weak':
        confidence += 0.05;
        break;
    }
    
    // Histogram strength
    const histogramStrength = Math.abs(this.histogram);
    confidence += Math.min(0.2, histogramStrength * 100);
    
    // Zero line position
    if ((direction === 'bullish' && this.macdLine > 0) || 
        (direction === 'bearish' && this.macdLine < 0)) {
      confidence += 0.1;
    }
    
    // Divergence bonus
    if (divergence && 
        ((direction === 'bullish' && divergence.type === 'bullish') ||
         (direction === 'bearish' && divergence.type === 'bearish'))) {
      confidence += 0.15;
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.macdLine = null;
    this.signalLine = null;
    this.histogram = null;
    this.previousMacdLine = null;
    this.previousSignalLine = null;
    this.previousHistogram = null;
    this.macdTrend = null;
    this.signalConfirmations = 0;
    this.lastCrossover = null;
  }

  /**
   * Get current indicator values
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      macdLine: this.macdLine,
      signalLine: this.signalLine,
      histogram: this.histogram,
      position: this.position,
      entryPrice: this.entryPrice,
      lastCrossover: this.lastCrossover
    };
  }
}

// Named export for compatibility
export { MACDStrategy };

// CommonJS export for compatibility with tests
module.exports = MACDStrategy;