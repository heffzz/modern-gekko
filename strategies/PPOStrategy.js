/**
 * PPO (Percentage Price Oscillator) Strategy
 * 
 * The PPO is similar to MACD but shows the difference between two moving averages
 * as a percentage of the larger moving average, making it more suitable for
 * comparing securities with different price levels.
 * 
 * PPO = ((Fast EMA - Slow EMA) / Slow EMA) * 100
 * Signal Line = EMA of PPO
 * Histogram = PPO - Signal Line
 * 
 * Trading signals:
 * - Buy: PPO crosses above signal line (bullish crossover)
 * - Sell: PPO crosses below signal line (bearish crossover)
 * - Additional confirmation from zero line crossovers and histogram
 */

import BaseStrategy from './BaseStrategy.js';

export default class PPOStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'PPO Strategy';
    this.description = 'Percentage Price Oscillator strategy with normalized momentum signals';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Momentum';
    
    // PPO state
    this.ppo = null;
    this.signalLine = null;
    this.histogram = null;
    this.previousPPO = null;
    this.previousSignalLine = null;
    this.previousHistogram = null;
    
    // Trend and momentum state
    this.ppoTrend = null;
    this.momentumStrength = 0;
    this.lastCrossover = null;
    this.crossoverCount = 0;
    
    this.initializeParameters();
  }

  initializeParameters() {
    super.initializeParameters();
    
    // PPO calculation parameters
    this.defineParameter('fastPeriod', {
      label: 'Fast EMA Period',
      description: 'Period for the fast EMA in PPO calculation',
      type: 'number',
      default: 12,
      min: 5,
      max: 30,
      step: 1,
      category: 'PPO Settings'
    });
    
    this.defineParameter('slowPeriod', {
      label: 'Slow EMA Period',
      description: 'Period for the slow EMA in PPO calculation',
      type: 'number',
      default: 26,
      min: 15,
      max: 50,
      step: 1,
      category: 'PPO Settings',
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
      category: 'PPO Settings'
    });
    
    // Signal confirmation parameters
    this.defineParameter('requireZeroCross', {
      label: 'Require Zero Line Cross',
      description: 'Only trade when PPO crosses zero line',
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
    
    this.defineParameter('minPPOValue', {
      label: 'Min PPO Value (%)',
      description: 'Minimum absolute PPO value for valid signal',
      type: 'number',
      default: 0.1,
      min: 0,
      max: 2,
      step: 0.01,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('momentumFilter', {
      label: 'Momentum Filter',
      description: 'Filter signals based on momentum strength',
      type: 'select',
      default: 'medium',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'weak', label: 'Weak Momentum Only' },
        { value: 'medium', label: 'Medium Momentum' },
        { value: 'strong', label: 'Strong Momentum Only' }
      ],
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('volatilityAdjustment', {
      label: 'Volatility Adjustment',
      description: 'Adjust signal thresholds based on market volatility',
      type: 'boolean',
      default: true,
      category: 'Advanced Features'
    });
    
    this.defineParameter('trendAlignment', {
      label: 'Trend Alignment Filter',
      description: 'Only trade in alignment with longer-term trend',
      type: 'boolean',
      default: true,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('trendPeriod', {
      label: 'Trend Period',
      description: 'Period for trend alignment calculation',
      type: 'number',
      default: 50,
      min: 30,
      max: 200,
      step: 5,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('whipsawProtection', {
      label: 'Whipsaw Protection',
      description: 'Minimum time between signals to avoid whipsaws',
      type: 'number',
      default: 3,
      min: 0,
      max: 20,
      step: 1,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('divergenceDetection', {
      label: 'Enable Divergence Detection',
      description: 'Detect price-PPO divergences for additional signals',
      type: 'boolean',
      default: true,
      category: 'Advanced Features'
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
   * Calculate PPO components
   * @param {Array} prices - Price array
   * @param {number} fastPeriod - Fast EMA period (optional, for testing)
   * @param {number} slowPeriod - Slow EMA period (optional, for testing)
   * @returns {Object|number} PPO components or single PPO value
   */
  calculatePPO(prices, fastPeriod = null, slowPeriod = null) {
    // If periods are provided, return just the PPO value for testing
    if (fastPeriod && slowPeriod) {
      const fastEMA = this.calculateEMA(prices, fastPeriod);
      const slowEMA = this.calculateEMA(prices, slowPeriod);
      
      if (!fastEMA || !slowEMA || fastEMA.length === 0 || slowEMA.length === 0) {
        return null;
      }
      
      const fast = fastEMA[fastEMA.length - 1];
      const slow = slowEMA[slowEMA.length - 1];
      
      if (slow === 0) {
        return 0;
      }
      
      return ((fast - slow) / slow) * 100;
    }
    const fastEMA = this.calculateEMA(prices, this.parameters.fastPeriod);
    const slowEMA = this.calculateEMA(prices, this.parameters.slowPeriod);
    
    if (!fastEMA || !slowEMA) {
      return null;
    }
    
    // Calculate PPO line
    const ppoLine = [];
    const startIndex = slowEMA.length - fastEMA.length;
    
    for (let i = 0; i < fastEMA.length - startIndex; i++) {
      const fast = fastEMA[i + startIndex];
      const slow = slowEMA[i + startIndex];
      
      if (slow !== 0) {
        const ppoValue = ((fast - slow) / slow) * 100;
        ppoLine.push(ppoValue);
      } else {
        ppoLine.push(0);
      }
    }
    
    if (ppoLine.length === 0) {
      return null;
    }
    
    // Calculate signal line (EMA of PPO line)
    const signalLine = this.calculateEMA(ppoLine, this.parameters.signalPeriod);
    
    if (!signalLine) {
      return null;
    }
    
    // Calculate histogram
    const histogram = [];
    const histogramStartIndex = ppoLine.length - signalLine.length;
    
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(ppoLine[i + histogramStartIndex] - signalLine[i]);
    }
    
    return {
      ppo: ppoLine[ppoLine.length - 1],
      signalLine: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1],
      ppoArray: ppoLine,
      signalArray: signalLine,
      histogramArray: histogram
    };
  }

  /**
   * Calculate market volatility using Average True Range
   * @param {Array} candles - Candle data
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
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
  }

  /**
   * Calculate momentum strength based on PPO characteristics
   * @param {Array} ppoArray - PPO history
   * @param {Array} histogramArray - Histogram history
   * @returns {string} Momentum strength: 'weak', 'medium', 'strong'
   */
  calculateMomentumStrength(ppoArray, histogramArray) {
    if (!ppoArray || !histogramArray || ppoArray.length < 10) {
      return 'weak';
    }
    
    const recentPPO = ppoArray.slice(-10);
    const recentHistogram = histogramArray.slice(-5);
    
    // Check PPO momentum
    const ppoMomentum = Math.abs(recentPPO[recentPPO.length - 1] - recentPPO[0]);
    
    // Check histogram consistency
    const histogramConsistency = recentHistogram.every(h => h > 0) || recentHistogram.every(h => h < 0);
    
    // Check PPO distance from zero
    const ppoDistance = Math.abs(this.ppo);
    
    if (ppoMomentum > 1 && histogramConsistency && ppoDistance > 0.5) {
      return 'strong';
    } else if (ppoMomentum > 0.5 || histogramConsistency) {
      return 'medium';
    }
    
    return 'weak';
  }

  /**
   * Check trend alignment
   * @param {Array} prices - Price history
   * @returns {string} Trend direction: 'up', 'down', 'sideways'
   */
  checkTrendAlignment(prices) {
    if (!this.parameters.trendAlignment || prices.length < this.parameters.trendPeriod) {
      return 'sideways';
    }
    
    const trendEMA = this.calculateEMA(prices, this.parameters.trendPeriod);
    if (!trendEMA) {
      return 'sideways';
    }
    
    const currentPrice = prices[prices.length - 1];
    const trendValue = trendEMA[trendEMA.length - 1];
    
    const threshold = 0.01; // 1% threshold
    
    if (currentPrice > trendValue * (1 + threshold)) {
      return 'up';
    } else if (currentPrice < trendValue * (1 - threshold)) {
      return 'down';
    }
    
    return 'sideways';
  }

  /**
   * Detect divergences between price and PPO
   * @param {Array} prices - Price history
   * @param {Array} ppoArray - PPO history
   * @returns {Object|null} Divergence information
   */
  detectDivergence(prices, ppoArray) {
    if (!this.parameters.divergenceDetection || prices.length < 20 || ppoArray.length < 20) {
      return null;
    }
    
    const lookback = 15;
    const recentPrices = prices.slice(-lookback);
    const recentPPO = ppoArray.slice(-lookback);
    
    // Find peaks and troughs
    const priceHighs = [];
    const priceLows = [];
    const ppoHighs = [];
    const ppoLows = [];
    
    for (let i = 2; i < lookback - 2; i++) {
      // Price peaks (local maxima)
      if (recentPrices[i] > recentPrices[i - 1] && 
          recentPrices[i] > recentPrices[i + 1] &&
          recentPrices[i] > recentPrices[i - 2] && 
          recentPrices[i] > recentPrices[i + 2]) {
        priceHighs.push({ index: i, value: recentPrices[i] });
      }
      
      // Price troughs (local minima)
      if (recentPrices[i] < recentPrices[i - 1] && 
          recentPrices[i] < recentPrices[i + 1] &&
          recentPrices[i] < recentPrices[i - 2] && 
          recentPrices[i] < recentPrices[i + 2]) {
        priceLows.push({ index: i, value: recentPrices[i] });
      }
      
      // PPO peaks
      if (recentPPO[i] > recentPPO[i - 1] && 
          recentPPO[i] > recentPPO[i + 1] &&
          recentPPO[i] > recentPPO[i - 2] && 
          recentPPO[i] > recentPPO[i + 2]) {
        ppoHighs.push({ index: i, value: recentPPO[i] });
      }
      
      // PPO troughs
      if (recentPPO[i] < recentPPO[i - 1] && 
          recentPPO[i] < recentPPO[i + 1] &&
          recentPPO[i] < recentPPO[i - 2] && 
          recentPPO[i] < recentPPO[i + 2]) {
        ppoLows.push({ index: i, value: recentPPO[i] });
      }
    }
    
    // Check for bullish divergence (price lower low, PPO higher low)
    if (priceLows.length >= 2 && ppoLows.length >= 2) {
      const lastPriceLow = priceLows[priceLows.length - 1];
      const prevPriceLow = priceLows[priceLows.length - 2];
      const lastPPOLow = ppoLows[ppoLows.length - 1];
      const prevPPOLow = ppoLows[ppoLows.length - 2];
      
      if (lastPriceLow.value < prevPriceLow.value && lastPPOLow.value > prevPPOLow.value) {
        const strength = this.calculateDivergenceStrength(lastPriceLow, prevPriceLow, lastPPOLow, prevPPOLow);
        return { type: 'bullish', strength };
      }
    }
    
    // Check for bearish divergence (price higher high, PPO lower high)
    if (priceHighs.length >= 2 && ppoHighs.length >= 2) {
      const lastPriceHigh = priceHighs[priceHighs.length - 1];
      const prevPriceHigh = priceHighs[priceHighs.length - 2];
      const lastPPOHigh = ppoHighs[ppoHighs.length - 1];
      const prevPPOHigh = ppoHighs[ppoHighs.length - 2];
      
      if (lastPriceHigh.value > prevPriceHigh.value && lastPPOHigh.value < prevPPOHigh.value) {
        const strength = this.calculateDivergenceStrength(lastPriceHigh, prevPriceHigh, lastPPOHigh, prevPPOHigh);
        return { type: 'bearish', strength };
      }
    }
    
    return null;
  }

  /**
   * Calculate divergence strength
   * @param {Object} lastPrice - Last price point
   * @param {Object} prevPrice - Previous price point
   * @param {Object} lastPPO - Last PPO point
   * @param {Object} prevPPO - Previous PPO point
   * @returns {string} Divergence strength
   */
  calculateDivergenceStrength(lastPrice, prevPrice, lastPPO, prevPPO) {
    const priceChange = Math.abs((lastPrice.value - prevPrice.value) / prevPrice.value);
    const ppoChange = Math.abs(lastPPO.value - prevPPO.value);
    
    if (priceChange > 0.05 && ppoChange > 1) {
      return 'strong';
    } else if (priceChange > 0.02 && ppoChange > 0.5) {
      return 'medium';
    }
    
    return 'weak';
  }

  /**
   * Adjust signal thresholds based on volatility
   * @param {Array} candles - Historical candles
   * @returns {Object} Adjusted thresholds
   */
  getVolatilityAdjustedThresholds(candles) {
    let minPPOValue = this.parameters.minPPOValue;
    
    if (this.parameters.volatilityAdjustment && candles.length > 20) {
      const atr = this.calculateATR(candles);
      if (atr) {
        const currentPrice = candles[candles.length - 1].close;
        const volatilityPercent = (atr / currentPrice) * 100;
        
        // Adjust threshold based on volatility
        const volatilityFactor = Math.min(3, Math.max(0.5, volatilityPercent / 2));
        minPPOValue = this.parameters.minPPOValue * volatilityFactor;
      }
    }
    
    return { minPPOValue };
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
    const requiredBars = Math.max(this.parameters.slowPeriod + this.parameters.signalPeriod, this.parameters.trendPeriod, 50);
    if (historicalCandles.length < requiredBars) {
      return null;
    }
    
    // Check risk management
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Calculate PPO
    const closePrices = historicalCandles.map(c => c.close);
    const ppoData = this.calculatePPO(closePrices);
    
    if (!ppoData) {
      return null;
    }
    
    // Store previous values
    this.previousPPO = this.ppo;
    this.previousSignalLine = this.signalLine;
    this.previousHistogram = this.histogram;
    
    // Update current values
    this.ppo = ppoData.ppo;
    this.ppoLine = ppoData.ppo; // Alias for compatibility
    this.signalLine = ppoData.signalLine;
    this.histogram = ppoData.histogram;
    
    if (this.previousPPO === null || this.previousSignalLine === null) {
      return null;
    }
    
    // Check whipsaw protection
    if (this.lastCrossover && 
        (candle.timestamp - this.lastCrossover) < (this.parameters.whipsawProtection * 60000)) {
      return null;
    }
    
    // Calculate momentum strength
    const momentumStrength = this.calculateMomentumStrength(ppoData.ppoArray, ppoData.histogramArray);
    
    // Check momentum filter
    if (this.parameters.momentumFilter !== 'off' && 
        this.parameters.momentumFilter !== momentumStrength) {
      return null;
    }
    
    // Check trend alignment
    const trend = this.checkTrendAlignment(closePrices);
    
    // Detect divergences
    const divergence = this.detectDivergence(closePrices, ppoData.ppoArray);
    
    // Get volatility-adjusted thresholds
    const thresholds = this.getVolatilityAdjustedThresholds(historicalCandles);
    
    // Entry signals
    if (!this.position) {
      // Bullish crossover: PPO crosses above signal line
      if (this.previousPPO <= this.previousSignalLine && 
          this.ppo > this.signalLine) {
        
        // Check zero line requirement
        if (this.parameters.requireZeroCross && this.ppo <= 0) {
          return null;
        }
        
        // Check histogram confirmation
        if (this.parameters.histogramConfirmation && 
            (this.histogram <= 0 || Math.abs(this.histogram) < thresholds.minPPOValue)) {
          return null;
        }
        
        // Check minimum PPO value
        if (Math.abs(this.ppo) < thresholds.minPPOValue) {
          return null;
        }
        
        // Check trend alignment
        if (this.parameters.trendAlignment && trend === 'down') {
          return null;
        }
        
        this.lastCrossover = candle.timestamp;
        this.crossoverCount++;
        
        const confidence = this.calculateSignalConfidence('bullish', momentumStrength, divergence, trend);
        
        return this.createEntrySignal('long', candle.close, candle.timestamp, {
          reason: 'PPO bullish crossover',
          ppo: this.ppo,
          signalLine: this.signalLine,
          histogram: this.histogram,
          momentumStrength,
          trend,
          divergence,
          thresholds,
          confidence
        });
      }
      
      // Divergence-based entry
      if (divergence && divergence.type === 'bullish' && divergence.strength !== 'weak' &&
          this.ppo > this.signalLine && Math.abs(this.ppo) > thresholds.minPPOValue) {
        
        this.lastCrossover = candle.timestamp;
        
        return this.createEntrySignal('long', candle.close, candle.timestamp, {
          reason: 'PPO bullish divergence',
          ppo: this.ppo,
          signalLine: this.signalLine,
          divergence,
          confidence: 0.75
        });
      }
    } else if (this.position === 'long') {
      // Bearish crossover: PPO crosses below signal line
      if (this.previousPPO >= this.previousSignalLine && 
          this.ppo < this.signalLine) {
        
        this.lastCrossover = candle.timestamp;
        
        return this.createExitSignal('ppo_crossover', candle.close, candle.timestamp, {
          reason: 'PPO bearish crossover',
          ppo: this.ppo,
          signalLine: this.signalLine,
          histogram: this.histogram
        });
      }
      
      // Divergence-based exit
      if (divergence && divergence.type === 'bearish' && divergence.strength !== 'weak') {
        return this.createExitSignal('bearish_divergence', candle.close, candle.timestamp, {
          reason: 'PPO bearish divergence detected',
          ppo: this.ppo,
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
   * @param {string} momentumStrength - Momentum strength
   * @param {Object} divergence - Divergence data
   * @param {string} trend - Trend direction
   * @returns {number} Confidence score (0-1)
   */
  calculateSignalConfidence(direction, momentumStrength, divergence, trend) {
    let confidence = 0.5;
    
    // Momentum strength bonus
    switch (momentumStrength) {
      case 'strong':
        confidence += 0.25;
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
    confidence += Math.min(0.2, histogramStrength / 5);
    
    // Zero line position
    if ((direction === 'bullish' && this.ppo > 0) || 
        (direction === 'bearish' && this.ppo < 0)) {
      confidence += 0.1;
    }
    
    // Trend alignment
    if ((direction === 'bullish' && trend === 'up') ||
        (direction === 'bearish' && trend === 'down')) {
      confidence += 0.15;
    }
    
    // Divergence bonus
    if (divergence && 
        ((direction === 'bullish' && divergence.type === 'bullish') ||
         (direction === 'bearish' && divergence.type === 'bearish'))) {
      confidence += divergence.strength === 'strong' ? 0.2 : divergence.strength === 'medium' ? 0.1 : 0.05;
    }
    
    // PPO distance from signal line
    const separation = Math.abs(this.ppo - this.signalLine);
    confidence += Math.min(0.1, separation / 10);
    
    return Math.min(0.95, confidence);
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.ppo = null;
    this.signalLine = null;
    this.histogram = null;
    this.previousPPO = null;
    this.previousSignalLine = null;
    this.previousHistogram = null;
    this.ppoTrend = null;
    this.momentumStrength = 0;
    this.lastCrossover = null;
    this.crossoverCount = 0;
  }

  /**
   * Get current indicator values
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      ppo: this.ppo,
      signalLine: this.signalLine,
      histogram: this.histogram,
      momentumStrength: this.momentumStrength,
      crossoverCount: this.crossoverCount,
      position: this.position,
      entryPrice: this.entryPrice,
      lastCrossover: this.lastCrossover
    };
  }
}

// Named export for compatibility
export { PPOStrategy };

// CommonJS export for compatibility with tests
module.exports = PPOStrategy;