/**
 * RSI (Relative Strength Index) Strategy
 * 
 * This strategy uses the RSI oscillator to identify overbought and oversold conditions:
 * - RSI > 70: Overbought (potential sell signal)
 * - RSI < 30: Oversold (potential buy signal)
 * - RSI crossovers and divergences for additional confirmation
 * 
 * Enhanced features:
 * - Multiple RSI timeframes
 * - Dynamic overbought/oversold levels
 * - Divergence detection
 * - Trend filtering
 * - Mean reversion and momentum modes
 */

import BaseStrategy from './BaseStrategy.js';

export default class RSIStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'RSI Strategy';
    this.description = 'Relative Strength Index strategy with overbought/oversold signals and divergence detection';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Oscillator';
    
    // RSI state
    this.rsi = null;
    this.previousRSI = null;
    this.rsiHistory = [];
    this.priceHistory = [];
    
    // Multi-timeframe RSI
    this.longRSI = null;
    this.shortRSI = null;
    
    // Signal state
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.consecutiveOverbought = 0;
    this.consecutiveOversold = 0;
    
    this.initializeParameters();
  }

  initializeParameters() {
    super.initializeParameters();
    
    // RSI calculation parameters
    this.defineParameter('rsiPeriod', {
      label: 'RSI Period',
      description: 'Period for RSI calculation',
      type: 'number',
      default: 14,
      min: 5,
      max: 50,
      step: 1,
      category: 'RSI Settings'
    });
    
    this.defineParameter('overboughtLevel', {
      label: 'Overbought Level',
      description: 'RSI level considered overbought',
      type: 'number',
      default: 70,
      min: 60,
      max: 90,
      step: 1,
      category: 'RSI Settings'
    });
    
    this.defineParameter('oversoldLevel', {
      label: 'Oversold Level',
      description: 'RSI level considered oversold',
      type: 'number',
      default: 30,
      min: 10,
      max: 40,
      step: 1,
      category: 'RSI Settings',
      validation: (value) => {
        if (value >= this.parameters.overboughtLevel) {
          return 'Oversold level must be less than overbought level';
        }
        return true;
      }
    });
    
    // Trading mode
    this.defineParameter('tradingMode', {
      label: 'Trading Mode',
      description: 'Strategy trading approach',
      type: 'select',
      default: 'mean_reversion',
      options: [
        { value: 'mean_reversion', label: 'Mean Reversion (contrarian)' },
        { value: 'momentum', label: 'Momentum (trend following)' },
        { value: 'hybrid', label: 'Hybrid (context-dependent)' },
        { value: 'divergence', label: 'Divergence Detection' }
      ],
      category: 'Strategy Mode'
    });
    
    // Multi-timeframe settings
    this.defineParameter('useMultiTimeframe', {
      label: 'Enable Multi-Timeframe',
      description: 'Use multiple RSI timeframes for confirmation',
      type: 'boolean',
      default: true,
      category: 'Multi-Timeframe'
    });
    
    this.defineParameter('shortRSIPeriod', {
      label: 'Short RSI Period',
      description: 'Period for short-term RSI',
      type: 'number',
      default: 7,
      min: 3,
      max: 20,
      step: 1,
      category: 'Multi-Timeframe'
    });
    
    this.defineParameter('longRSIPeriod', {
      label: 'Long RSI Period',
      description: 'Period for long-term RSI',
      type: 'number',
      default: 21,
      min: 15,
      max: 50,
      step: 1,
      category: 'Multi-Timeframe'
    });
    
    // Signal confirmation
    this.defineParameter('requireDivergence', {
      label: 'Require Divergence',
      description: 'Only trade when divergence is detected',
      type: 'boolean',
      default: false,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('consecutiveBarsRequired', {
      label: 'Consecutive Bars Required',
      description: 'Number of consecutive overbought/oversold bars required',
      type: 'number',
      default: 2,
      min: 1,
      max: 10,
      step: 1,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('dynamicLevels', {
      label: 'Dynamic Levels',
      description: 'Adjust overbought/oversold levels based on volatility',
      type: 'boolean',
      default: false,
      category: 'Advanced Features'
    });
    
    this.defineParameter('trendFilter', {
      label: 'Trend Filter',
      description: 'Filter signals based on overall trend',
      type: 'select',
      default: 'off',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'sma', label: 'Simple Moving Average' },
        { value: 'ema', label: 'Exponential Moving Average' },
        { value: 'price_action', label: 'Price Action' }
      ],
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('trendPeriod', {
      label: 'Trend Filter Period',
      description: 'Period for trend filter calculation',
      type: 'number',
      default: 50,
      min: 20,
      max: 200,
      step: 5,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('minSignalGap', {
      label: 'Min Signal Gap (bars)',
      description: 'Minimum bars between signals to avoid overtrading',
      type: 'number',
      default: 5,
      min: 0,
      max: 20,
      step: 1,
      category: 'Signal Confirmation'
    });
  }

  /**
   * Calculate RSI
   * @param {Array} prices - Price array
   * @param {number} period - RSI period
   * @returns {number} RSI value
   */
  calculateRSI(prices, period) {
    if (prices.length < period + 1) {
      return null;
    }
    
    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    if (gains.length < period) {
      return null;
    }
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // Calculate RSI for remaining periods using Wilder's smoothing
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
    
    if (avgLoss === 0) {
      return 100;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate dynamic overbought/oversold levels based on volatility
   * @param {Array} rsiHistory - Historical RSI values
   * @returns {Object} Dynamic levels
   */
  calculateDynamicLevels(rsiHistory) {
    if (!this.parameters.dynamicLevels || rsiHistory.length < 20) {
      return {
        overbought: this.parameters.overboughtLevel,
        oversold: this.parameters.oversoldLevel
      };
    }
    
    const recentRSI = rsiHistory.slice(-20);
    const mean = recentRSI.reduce((sum, rsi) => sum + rsi, 0) / recentRSI.length;
    const variance = recentRSI.reduce((sum, rsi) => sum + Math.pow(rsi - mean, 2), 0) / recentRSI.length;
    const stdDev = Math.sqrt(variance);
    
    // Adjust levels based on volatility
    const volatilityFactor = Math.min(2, Math.max(0.5, stdDev / 10));
    
    return {
      overbought: Math.min(90, this.parameters.overboughtLevel + (10 * volatilityFactor)),
      oversold: Math.max(10, this.parameters.oversoldLevel - (10 * volatilityFactor))
    };
  }

  /**
   * Detect RSI divergences
   * @param {Array} prices - Price history
   * @param {Array} rsiHistory - RSI history
   * @returns {Object|null} Divergence information
   */
  detectDivergence(prices, rsiHistory) {
    if (prices.length < 20 || rsiHistory.length < 20) {
      return null;
    }
    
    const lookback = 10;
    const recentPrices = prices.slice(-lookback);
    const recentRSI = rsiHistory.slice(-lookback);
    
    // Find peaks and troughs
    const priceHighs = [];
    const priceLows = [];
    const rsiHighs = [];
    const rsiLows = [];
    
    for (let i = 1; i < lookback - 1; i++) {
      // Price peaks
      if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
        priceHighs.push({ index: i, value: recentPrices[i] });
      }
      
      // Price troughs
      if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
        priceLows.push({ index: i, value: recentPrices[i] });
      }
      
      // RSI peaks
      if (recentRSI[i] > recentRSI[i - 1] && recentRSI[i] > recentRSI[i + 1]) {
        rsiHighs.push({ index: i, value: recentRSI[i] });
      }
      
      // RSI troughs
      if (recentRSI[i] < recentRSI[i - 1] && recentRSI[i] < recentRSI[i + 1]) {
        rsiLows.push({ index: i, value: recentRSI[i] });
      }
    }
    
    // Check for bullish divergence (price lower low, RSI higher low)
    if (priceLows.length >= 2 && rsiLows.length >= 2) {
      const lastPriceLow = priceLows[priceLows.length - 1];
      const prevPriceLow = priceLows[priceLows.length - 2];
      const lastRSILow = rsiLows[rsiLows.length - 1];
      const prevRSILow = rsiLows[rsiLows.length - 2];
      
      if (lastPriceLow.value < prevPriceLow.value && lastRSILow.value > prevRSILow.value) {
        return { type: 'bullish', strength: this.calculateDivergenceStrength(lastPriceLow, prevPriceLow, lastRSILow, prevRSILow) };
      }
    }
    
    // Check for bearish divergence (price higher high, RSI lower high)
    if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
      const lastPriceHigh = priceHighs[priceHighs.length - 1];
      const prevPriceHigh = priceHighs[priceHighs.length - 2];
      const lastRSIHigh = rsiHighs[rsiHighs.length - 1];
      const prevRSIHigh = rsiHighs[rsiHighs.length - 2];
      
      if (lastPriceHigh.value > prevPriceHigh.value && lastRSIHigh.value < prevRSIHigh.value) {
        return { type: 'bearish', strength: this.calculateDivergenceStrength(lastPriceHigh, prevPriceHigh, lastRSIHigh, prevRSIHigh) };
      }
    }
    
    return null;
  }

  /**
   * Calculate divergence strength
   * @param {Object} lastPrice - Last price point
   * @param {Object} prevPrice - Previous price point
   * @param {Object} lastRSI - Last RSI point
   * @param {Object} prevRSI - Previous RSI point
   * @returns {string} Divergence strength
   */
  calculateDivergenceStrength(lastPrice, prevPrice, lastRSI, prevRSI) {
    const priceChange = Math.abs((lastPrice.value - prevPrice.value) / prevPrice.value);
    const rsiChange = Math.abs(lastRSI.value - prevRSI.value);
    
    if (priceChange > 0.05 && rsiChange > 10) {
      return 'strong';
    } else if (priceChange > 0.02 && rsiChange > 5) {
      return 'medium';
    }
    
    return 'weak';
  }

  /**
   * Check trend filter
   * @param {Array} candles - Historical candles
   * @returns {string} Trend direction: 'up', 'down', 'sideways'
   */
  checkTrendFilter(candles) {
    if (this.parameters.trendFilter === 'off' || candles.length < this.parameters.trendPeriod) {
      return 'sideways';
    }
    
    const prices = candles.map(c => c.close);
    const currentPrice = prices[prices.length - 1];
    
    switch (this.parameters.trendFilter) {
      case 'sma': {
        const sma = prices.slice(-this.parameters.trendPeriod).reduce((sum, p) => sum + p, 0) / this.parameters.trendPeriod;
        return currentPrice > sma * 1.01 ? 'up' : currentPrice < sma * 0.99 ? 'down' : 'sideways';
      }
      
      case 'ema': {
        const ema = this.calculateEMA(prices, this.parameters.trendPeriod);
        if (!ema) return 'sideways';
        const currentEMA = ema[ema.length - 1];
        return currentPrice > currentEMA * 1.01 ? 'up' : currentPrice < currentEMA * 0.99 ? 'down' : 'sideways';
      }
      
      case 'price_action': {
        const recentCandles = candles.slice(-10);
        const higherHighs = recentCandles.filter((c, i) => i > 0 && c.high > recentCandles[i - 1].high).length;
        const lowerLows = recentCandles.filter((c, i) => i > 0 && c.low < recentCandles[i - 1].low).length;
        
        if (higherHighs > lowerLows + 2) return 'up';
        if (lowerLows > higherHighs + 2) return 'down';
        return 'sideways';
      }
      
      default:
        return 'sideways';
    }
  }

  /**
   * Calculate EMA for trend filter
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
    const requiredBars = Math.max(this.parameters.rsiPeriod * 2, this.parameters.trendPeriod, 50);
    if (historicalCandles.length < requiredBars) {
      return null;
    }
    
    // Check risk management
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Calculate RSI values
    const closePrices = historicalCandles.map(c => c.close);
    
    this.previousRSI = this.rsi;
    this.rsi = this.calculateRSI(closePrices, this.parameters.rsiPeriod);
    
    if (this.rsi === null) {
      return null;
    }
    
    // Update history
    this.rsiHistory.push(this.rsi);
    this.priceHistory.push(candle.close);
    
    // Keep history manageable
    if (this.rsiHistory.length > 100) {
      this.rsiHistory = this.rsiHistory.slice(-50);
      this.priceHistory = this.priceHistory.slice(-50);
    }
    
    // Calculate multi-timeframe RSI if enabled
    if (this.parameters.useMultiTimeframe) {
      this.shortRSI = this.calculateRSI(closePrices, this.parameters.shortRSIPeriod);
      this.longRSI = this.calculateRSI(closePrices, this.parameters.longRSIPeriod);
    }
    
    // Get dynamic levels
    const levels = this.calculateDynamicLevels(this.rsiHistory);
    
    // Check trend filter
    const trend = this.checkTrendFilter(historicalCandles);
    
    // Detect divergence
    const divergence = this.detectDivergence(this.priceHistory, this.rsiHistory);
    
    // Check signal gap. minSignalGap is expressed in bars, so convert it to
    // milliseconds using the detected candle interval instead of assuming a
    // fixed 1-minute timeframe.
    if (this.lastSignalTime && this.parameters.minSignalGap > 0) {
      const interval = this.getCandleInterval(historicalCandles);
      if (interval > 0 &&
          (candle.timestamp - this.lastSignalTime) < (this.parameters.minSignalGap * interval)) {
        return null;
      }
    }
    
    // Update consecutive counters
    if (this.rsi >= levels.overbought) {
      this.consecutiveOverbought++;
      this.consecutiveOversold = 0;
    } else if (this.rsi <= levels.oversold) {
      this.consecutiveOversold++;
      this.consecutiveOverbought = 0;
    } else {
      this.consecutiveOverbought = 0;
      this.consecutiveOversold = 0;
    }
    
    // Entry signals based on trading mode
    if (!this.position) {
      const signal = this.generateEntrySignal(candle, levels, trend, divergence);
      if (signal) {
        this.lastSignalTime = candle.timestamp;
        this.lastSignalType = signal.direction;
        return signal;
      }
    } else if (this.position === 'long') {
      // Exit signals
      const exitSignal = this.generateExitSignal(candle, levels, trend, divergence);
      if (exitSignal) {
        this.lastSignalTime = candle.timestamp;
        return exitSignal;
      }
    }
    
    return null;
  }

  /**
   * Generate entry signal based on trading mode
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateEntrySignal(candle, levels, trend, divergence) {
    // Check divergence requirement
    if (this.parameters.requireDivergence && !divergence) {
      return null;
    }

    // Note: the consecutive-oversold requirement is enforced inside the
    // mean-reversion signal only. Momentum entries fire as RSI rises back
    // above the oversold level, at which point the oversold streak has just
    // reset, so applying the gate here would suppress them entirely.
    switch (this.parameters.tradingMode) {
      case 'mean_reversion':
        return this.generateMeanReversionSignal(candle, levels, trend, divergence);

      case 'momentum':
        return this.generateMomentumSignal(candle, levels, trend, divergence);

      case 'hybrid':
        return this.generateHybridSignal(candle, levels, trend, divergence);

      case 'divergence':
        return this.generateDivergenceSignal(candle, levels, trend, divergence);

      default:
        return null;
    }
  }

  /**
   * Generate mean reversion entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateMeanReversionSignal(candle, levels, trend, divergence) {
    // Require the market to have been oversold for the configured number of
    // consecutive bars before fading the move.
    if (this.consecutiveOversold < this.parameters.consecutiveBarsRequired) {
      return null;
    }

    // Buy on oversold conditions
    if (this.rsi <= levels.oversold && this.previousRSI > this.rsi) {
      // Optional trend filter
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      // Multi-timeframe confirmation
      if (this.parameters.useMultiTimeframe && this.shortRSI > levels.oversold) {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'RSI oversold mean reversion',
        rsi: this.rsi,
        shortRSI: this.shortRSI,
        longRSI: this.longRSI,
        levels,
        trend,
        divergence,
        consecutiveOversold: this.consecutiveOversold,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate momentum entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateMomentumSignal(candle, levels, trend, divergence) {
    // Buy on RSI breaking above oversold (momentum)
    if (this.previousRSI <= levels.oversold && this.rsi > levels.oversold) {
      // Trend confirmation
      if (trend !== 'up' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'RSI momentum breakout',
        rsi: this.rsi,
        previousRSI: this.previousRSI,
        levels,
        trend,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate hybrid entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateHybridSignal(candle, levels, trend, divergence) {
    // Use mean reversion in sideways markets, momentum in trending markets
    if (trend === 'sideways') {
      return this.generateMeanReversionSignal(candle, levels, trend, divergence);
    } else {
      return this.generateMomentumSignal(candle, levels, trend, divergence);
    }
  }

  /**
   * Generate divergence-based entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateDivergenceSignal(candle, levels, trend, divergence) {
    // Enter long on a confirmed bullish divergence (price makes a lower low
    // while RSI makes a higher low).
    if (divergence && divergence.type === 'bullish' && divergence.strength !== 'weak') {
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);

      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'RSI bullish divergence',
        rsi: this.rsi,
        divergence,
        levels,
        trend,
        confidence
      });
    }

    return null;
  }

  /**
   * Detect the candle interval (in ms) from the most recent timestamps.
   * Used to convert bar-based settings (e.g. minSignalGap) into time.
   * @param {Array} historicalCandles - Historical candles
   * @returns {number} Interval in milliseconds, or 0 if unknown
   */
  getCandleInterval(historicalCandles) {
    if (!historicalCandles || historicalCandles.length < 2) {
      return 0;
    }
    const n = historicalCandles.length;
    const diff = historicalCandles[n - 1].timestamp - historicalCandles[n - 2].timestamp;
    return diff > 0 ? diff : 0;
  }

  /**
   * Generate exit signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Exit signal or null
   */
  generateExitSignal(candle, levels, trend, divergence) {
    // Exit on overbought conditions
    if (this.rsi >= levels.overbought && this.consecutiveOverbought >= this.parameters.consecutiveBarsRequired) {
      return this.createExitSignal('rsi_overbought', candle.close, candle.timestamp, {
        reason: 'RSI overbought exit',
        rsi: this.rsi,
        levels,
        consecutiveOverbought: this.consecutiveOverbought
      });
    }
    
    // Exit on bearish divergence
    if (divergence && divergence.type === 'bearish' && divergence.strength !== 'weak') {
      return this.createExitSignal('bearish_divergence', candle.close, candle.timestamp, {
        reason: 'RSI bearish divergence',
        rsi: this.rsi,
        divergence
      });
    }
    
    return null;
  }

  /**
   * Calculate signal confidence
   * @param {string} direction - Signal direction
   * @param {Object} levels - Dynamic levels
   * @param {Object} divergence - Divergence data
   * @param {string} trend - Trend direction
   * @returns {number} Confidence score (0-1)
   */
  calculateSignalConfidence(direction, levels, divergence, trend) {
    let confidence = 0.5;
    
    // RSI extremity bonus
    if (direction === 'bullish') {
      const extremity = (levels.oversold - this.rsi) / levels.oversold;
      confidence += Math.min(0.3, extremity * 2);
    }
    
    // Multi-timeframe confirmation
    if (this.parameters.useMultiTimeframe && this.shortRSI && this.longRSI) {
      if ((direction === 'bullish' && this.shortRSI < this.longRSI) ||
          (direction === 'bearish' && this.shortRSI > this.longRSI)) {
        confidence += 0.15;
      }
    }
    
    // Divergence bonus
    if (divergence && 
        ((direction === 'bullish' && divergence.type === 'bullish') ||
         (direction === 'bearish' && divergence.type === 'bearish'))) {
      confidence += divergence.strength === 'strong' ? 0.25 : divergence.strength === 'medium' ? 0.15 : 0.1;
    }
    
    // Trend alignment
    if ((direction === 'bullish' && trend === 'up') ||
        (direction === 'bearish' && trend === 'down')) {
      confidence += 0.1;
    }
    
    // Consecutive bars bonus
    const consecutiveBonus = Math.min(0.2, (this.consecutiveOversold + this.consecutiveOverbought) * 0.05);
    confidence += consecutiveBonus;
    
    return Math.min(0.95, confidence);
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.rsi = null;
    this.previousRSI = null;
    this.rsiHistory = [];
    this.priceHistory = [];
    this.longRSI = null;
    this.shortRSI = null;
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.consecutiveOverbought = 0;
    this.consecutiveOversold = 0;
  }

  /**
   * Get current indicator values
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      rsi: this.rsi,
      shortRSI: this.shortRSI,
      longRSI: this.longRSI,
      consecutiveOverbought: this.consecutiveOverbought,
      consecutiveOversold: this.consecutiveOversold,
      position: this.position,
      entryPrice: this.entryPrice,
      lastSignalType: this.lastSignalType
    };
  }
}

// Named export for compatibility
export { RSIStrategy };

// CommonJS export for compatibility with tests
module.exports = RSIStrategy;