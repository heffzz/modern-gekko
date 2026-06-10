/**
 * StochRSI (Stochastic RSI) Strategy
 * 
 * StochRSI applies the Stochastic oscillator formula to RSI values instead of price data.
 * It oscillates between 0 and 1 (or 0 and 100) and is more sensitive than regular RSI,
 * providing earlier signals but also more false signals.
 * 
 * StochRSI = (RSI - Lowest Low RSI) / (Highest High RSI - Lowest Low RSI)
 * %K = SMA of StochRSI
 * %D = SMA of %K
 * 
 * Trading signals:
 * - Buy: %K crosses above %D in oversold region (< 0.2)
 * - Sell: %K crosses below %D in overbought region (> 0.8)
 * - Additional confirmation from divergences and trend filters
 */

import BaseStrategy from './BaseStrategy.js';

export default class StochRSIStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'StochRSI Strategy';
    this.description = 'Stochastic RSI strategy with enhanced sensitivity and multiple confirmation signals';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Oscillator';
    
    // StochRSI state
    this.rsi = null;
    this.stochRSI = null;
    this.percentK = null;
    this.percentD = null;
    this.previousPercentK = null;
    this.previousPercentD = null;
    
    // Historical data for calculations
    this.rsiHistory = [];
    this.priceHistory = [];
    this.stochRSIHistory = [];
    
    // Signal state
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.consecutiveOverbought = 0;
    this.consecutiveOversold = 0;
    this.signalStrength = 0;
    
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
      max: 30,
      step: 1,
      category: 'RSI Settings'
    });
    
    // StochRSI calculation parameters
    this.defineParameter('stochRSIPeriod', {
      label: 'StochRSI Period',
      description: 'Period for StochRSI calculation (lookback for RSI high/low)',
      type: 'number',
      default: 14,
      min: 5,
      max: 30,
      step: 1,
      category: 'StochRSI Settings'
    });
    
    this.defineParameter('kPeriod', {
      label: '%K Period',
      description: 'Period for %K smoothing (SMA of StochRSI)',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      step: 1,
      category: 'StochRSI Settings'
    });
    
    this.defineParameter('dPeriod', {
      label: '%D Period',
      description: 'Period for %D smoothing (SMA of %K)',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      step: 1,
      category: 'StochRSI Settings'
    });
    
    // Signal levels
    this.defineParameter('overboughtLevel', {
      label: 'Overbought Level',
      description: 'StochRSI level considered overbought (0-1)',
      type: 'number',
      default: 0.8,
      min: 0.6,
      max: 0.95,
      step: 0.05,
      category: 'Signal Levels'
    });
    
    this.defineParameter('oversoldLevel', {
      label: 'Oversold Level',
      description: 'StochRSI level considered oversold (0-1)',
      type: 'number',
      default: 0.2,
      min: 0.05,
      max: 0.4,
      step: 0.05,
      category: 'Signal Levels',
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
      description: 'Strategy approach for signal generation',
      type: 'select',
      default: 'crossover',
      options: [
        { value: 'crossover', label: 'Crossover (%K crosses %D)' },
        { value: 'level', label: 'Level (overbought/oversold)' },
        { value: 'hybrid', label: 'Hybrid (both conditions)' },
        { value: 'divergence', label: 'Divergence Focus' }
      ],
      category: 'Strategy Mode'
    });
    
    // Signal confirmation
    this.defineParameter('requireBothInZone', {
      label: 'Require Both %K and %D in Zone',
      description: 'Both %K and %D must be in overbought/oversold zone',
      type: 'boolean',
      default: true,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('consecutiveBarsRequired', {
      label: 'Consecutive Bars Required',
      description: 'Number of consecutive bars in zone before signal',
      type: 'number',
      default: 2,
      min: 1,
      max: 5,
      step: 1,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('minSeparation', {
      label: 'Min %K-%D Separation',
      description: 'Minimum separation between %K and %D for valid crossover',
      type: 'number',
      default: 0.05,
      min: 0,
      max: 0.2,
      step: 0.01,
      category: 'Signal Confirmation'
    });
    
    // Advanced features
    this.defineParameter('dynamicLevels', {
      label: 'Dynamic Levels',
      description: 'Adjust overbought/oversold levels based on volatility',
      type: 'boolean',
      default: false,
      category: 'Advanced Features'
    });
    
    this.defineParameter('divergenceDetection', {
      label: 'Enable Divergence Detection',
      description: 'Detect price-StochRSI divergences',
      type: 'boolean',
      default: true,
      category: 'Advanced Features'
    });
    
    this.defineParameter('trendFilter', {
      label: 'Trend Filter',
      description: 'Filter signals based on trend direction',
      type: 'select',
      default: 'off',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'ema', label: 'EMA Trend Filter' },
        { value: 'sma', label: 'SMA Trend Filter' },
        { value: 'price_action', label: 'Price Action Filter' }
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
    
    this.defineParameter('signalCooldown', {
      label: 'Signal Cooldown (bars)',
      description: 'Minimum bars between signals to reduce noise',
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
   * @returns {Array} RSI values
   */
  calculateRSI(prices, period) {
    if (prices.length < period + 1) {
      return null;
    }
    
    const rsiValues = [];
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
    
    // Calculate first RSI
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
    
    // Calculate remaining RSI values using Wilder's smoothing
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
    
    return rsiValues;
  }

  /**
   * Calculate StochRSI
   * @param {Array} rsiValues - RSI values array
   * @param {number} period - StochRSI period
   * @returns {Array} StochRSI values
   */
  calculateStochRSI(rsiValues, period) {
    if (!rsiValues || rsiValues.length < period) {
      return null;
    }
    
    const stochRSIValues = [];
    
    for (let i = period - 1; i < rsiValues.length; i++) {
      const rsiSlice = rsiValues.slice(i - period + 1, i + 1);
      const highestRSI = Math.max(...rsiSlice);
      const lowestRSI = Math.min(...rsiSlice);
      const currentRSI = rsiValues[i];
      
      if (highestRSI === lowestRSI) {
        stochRSIValues.push(0.5); // Neutral when no range
      } else {
        const stochRSI = (currentRSI - lowestRSI) / (highestRSI - lowestRSI);
        stochRSIValues.push(stochRSI);
      }
    }
    
    return stochRSIValues;
  }

  /**
   * Calculate Simple Moving Average
   * @param {Array} values - Values array
   * @param {number} period - SMA period
   * @returns {Array} SMA values
   */
  calculateSMA(values, period) {
    if (!values || values.length < period) {
      return null;
    }
    
    const smaValues = [];
    
    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      const average = slice.reduce((sum, val) => sum + val, 0) / period;
      smaValues.push(average);
    }
    
    return smaValues;
  }

  /**
   * Calculate dynamic overbought/oversold levels
   * @param {Array} stochRSIHistory - StochRSI history
   * @returns {Object} Dynamic levels
   */
  calculateDynamicLevels(stochRSIHistory) {
    if (!this.parameters.dynamicLevels || stochRSIHistory.length < 20) {
      return {
        overbought: this.parameters.overboughtLevel,
        oversold: this.parameters.oversoldLevel
      };
    }
    
    const recent = stochRSIHistory.slice(-20);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    
    // Adjust levels based on volatility
    const volatilityFactor = Math.min(2, Math.max(0.5, stdDev * 4));
    
    return {
      overbought: Math.min(0.95, this.parameters.overboughtLevel + (0.1 * volatilityFactor)),
      oversold: Math.max(0.05, this.parameters.oversoldLevel - (0.1 * volatilityFactor))
    };
  }

  /**
   * Detect divergences between price and StochRSI
   * @param {Array} prices - Price history
   * @param {Array} stochRSIHistory - StochRSI history
   * @returns {Object|null} Divergence information
   */
  detectDivergence(prices, stochRSIHistory) {
    if (!this.parameters.divergenceDetection || prices.length < 15 || stochRSIHistory.length < 15) {
      return null;
    }
    
    const lookback = 10;
    const recentPrices = prices.slice(-lookback);
    const recentStochRSI = stochRSIHistory.slice(-lookback);
    
    // Find peaks and troughs
    const priceHighs = [];
    const priceLows = [];
    const stochHighs = [];
    const stochLows = [];
    
    for (let i = 1; i < lookback - 1; i++) {
      // Price peaks
      if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
        priceHighs.push({ index: i, value: recentPrices[i] });
      }
      
      // Price troughs
      if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
        priceLows.push({ index: i, value: recentPrices[i] });
      }
      
      // StochRSI peaks
      if (recentStochRSI[i] > recentStochRSI[i - 1] && recentStochRSI[i] > recentStochRSI[i + 1]) {
        stochHighs.push({ index: i, value: recentStochRSI[i] });
      }
      
      // StochRSI troughs
      if (recentStochRSI[i] < recentStochRSI[i - 1] && recentStochRSI[i] < recentStochRSI[i + 1]) {
        stochLows.push({ index: i, value: recentStochRSI[i] });
      }
    }
    
    // Check for bullish divergence
    if (priceLows.length >= 2 && stochLows.length >= 2) {
      const lastPriceLow = priceLows[priceLows.length - 1];
      const prevPriceLow = priceLows[priceLows.length - 2];
      const lastStochLow = stochLows[stochLows.length - 1];
      const prevStochLow = stochLows[stochLows.length - 2];
      
      if (lastPriceLow.value < prevPriceLow.value && lastStochLow.value > prevStochLow.value) {
        return { type: 'bullish', strength: this.calculateDivergenceStrength(lastPriceLow, prevPriceLow, lastStochLow, prevStochLow) };
      }
    }
    
    // Check for bearish divergence
    if (priceHighs.length >= 2 && stochHighs.length >= 2) {
      const lastPriceHigh = priceHighs[priceHighs.length - 1];
      const prevPriceHigh = priceHighs[priceHighs.length - 2];
      const lastStochHigh = stochHighs[stochHighs.length - 1];
      const prevStochHigh = stochHighs[stochHighs.length - 2];
      
      if (lastPriceHigh.value > prevPriceHigh.value && lastStochHigh.value < prevStochHigh.value) {
        return { type: 'bearish', strength: this.calculateDivergenceStrength(lastPriceHigh, prevPriceHigh, lastStochHigh, prevStochHigh) };
      }
    }
    
    return null;
  }

  /**
   * Calculate divergence strength
   * @param {Object} lastPrice - Last price point
   * @param {Object} prevPrice - Previous price point
   * @param {Object} lastStoch - Last StochRSI point
   * @param {Object} prevStoch - Previous StochRSI point
   * @returns {string} Divergence strength
   */
  calculateDivergenceStrength(lastPrice, prevPrice, lastStoch, prevStoch) {
    const priceChange = Math.abs((lastPrice.value - prevPrice.value) / prevPrice.value);
    const stochChange = Math.abs(lastStoch.value - prevStoch.value);
    
    if (priceChange > 0.03 && stochChange > 0.2) {
      return 'strong';
    } else if (priceChange > 0.015 && stochChange > 0.1) {
      return 'medium';
    }
    
    return 'weak';
  }

  /**
   * Check trend filter
   * @param {Array} prices - Price history
   * @returns {string} Trend direction: 'up', 'down', 'sideways'
   */
  checkTrendFilter(prices) {
    if (this.parameters.trendFilter === 'off' || prices.length < this.parameters.trendPeriod) {
      return 'sideways';
    }
    
    const currentPrice = prices[prices.length - 1];
    
    switch (this.parameters.trendFilter) {
      case 'sma': {
        const sma = prices.slice(-this.parameters.trendPeriod).reduce((sum, p) => sum + p, 0) / this.parameters.trendPeriod;
        return currentPrice > sma * 1.005 ? 'up' : currentPrice < sma * 0.995 ? 'down' : 'sideways';
      }
      
      case 'ema': {
        const ema = this.calculateEMA(prices, this.parameters.trendPeriod);
        if (!ema) return 'sideways';
        const currentEMA = ema[ema.length - 1];
        return currentPrice > currentEMA * 1.005 ? 'up' : currentPrice < currentEMA * 0.995 ? 'down' : 'sideways';
      }
      
      case 'price_action': {
        const recent = prices.slice(-10);
        const higherHighs = recent.filter((p, i) => i > 0 && p > recent[i - 1]).length;
        const lowerLows = recent.filter((p, i) => i > 0 && p < recent[i - 1]).length;
        
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
    const requiredBars = Math.max(
      this.parameters.rsiPeriod + this.parameters.stochRSIPeriod + this.parameters.kPeriod + this.parameters.dPeriod,
      this.parameters.trendPeriod,
      50
    );
    
    if (historicalCandles.length < requiredBars) {
      return null;
    }
    
    // Check risk management
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Calculate indicators
    const closePrices = historicalCandles.map(c => c.close);
    
    // Calculate RSI
    const rsiValues = this.calculateRSI(closePrices, this.parameters.rsiPeriod);
    if (!rsiValues) {
      return null;
    }
    
    this.rsi = rsiValues[rsiValues.length - 1];
    
    // Calculate StochRSI
    const stochRSIValues = this.calculateStochRSI(rsiValues, this.parameters.stochRSIPeriod);
    if (!stochRSIValues) {
      return null;
    }
    
    this.stochRSI = stochRSIValues[stochRSIValues.length - 1];
    
    // Calculate %K (smoothed StochRSI)
    const percentKValues = this.calculateSMA(stochRSIValues, this.parameters.kPeriod);
    if (!percentKValues) {
      return null;
    }
    
    this.previousPercentK = this.percentK;
    this.percentK = percentKValues[percentKValues.length - 1];
    this.kPercent = this.percentK; // Alias for compatibility
    
    // Calculate %D (smoothed %K)
    const percentDValues = this.calculateSMA(percentKValues, this.parameters.dPeriod);
    if (!percentDValues) {
      return null;
    }
    
    this.previousPercentD = this.percentD;
    this.percentD = percentDValues[percentDValues.length - 1];
    this.dPercent = this.percentD; // Alias for compatibility
    
    if (this.previousPercentK === null || this.previousPercentD === null) {
      return null;
    }
    
    // Update history
    this.stochRSIHistory.push(this.stochRSI);
    this.priceHistory.push(candle.close);
    
    // Keep history manageable
    if (this.stochRSIHistory.length > 50) {
      this.stochRSIHistory = this.stochRSIHistory.slice(-30);
      this.priceHistory = this.priceHistory.slice(-30);
    }
    
    // Get dynamic levels
    const levels = this.calculateDynamicLevels(this.stochRSIHistory);
    
    // Check trend filter
    const trend = this.checkTrendFilter(closePrices);
    
    // Detect divergence
    const divergence = this.detectDivergence(this.priceHistory, this.stochRSIHistory);
    
    // Check signal cooldown
    if (this.lastSignalTime && 
        (candle.timestamp - this.lastSignalTime) < (this.parameters.signalCooldown * 60000)) {
      return null;
    }
    
    // Update consecutive counters
    if (this.percentK >= levels.overbought && this.percentD >= levels.overbought) {
      this.consecutiveOverbought++;
      this.consecutiveOversold = 0;
    } else if (this.percentK <= levels.oversold && this.percentD <= levels.oversold) {
      this.consecutiveOversold++;
      this.consecutiveOverbought = 0;
    } else {
      this.consecutiveOverbought = 0;
      this.consecutiveOversold = 0;
    }
    
    // Generate signals based on trading mode
    if (!this.position) {
      const signal = this.generateEntrySignal(candle, levels, trend, divergence);
      if (signal) {
        this.lastSignalTime = candle.timestamp;
        this.lastSignalType = signal.direction;
        return signal;
      }
    } else if (this.position === 'long') {
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
    switch (this.parameters.tradingMode) {
      case 'crossover':
        return this.generateCrossoverSignal(candle, levels, trend, divergence);
      
      case 'level':
        return this.generateLevelSignal(candle, levels, trend, divergence);
      
      case 'hybrid':
        return this.generateHybridSignal(candle, levels, trend, divergence);
      
      case 'divergence':
        return this.generateDivergenceSignal(candle, levels, trend, divergence);
      
      default:
        return null;
    }
  }

  /**
   * Generate crossover-based entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateCrossoverSignal(candle, levels, trend, divergence) {
    // Bullish crossover: %K crosses above %D in oversold region
    if (this.previousPercentK <= this.previousPercentD && 
        this.percentK > this.percentD &&
        this.percentK <= levels.oversold + 0.1) { // Allow some buffer above oversold
      
      // Check minimum separation
      if (Math.abs(this.percentK - this.percentD) < this.parameters.minSeparation) {
        return null;
      }
      
      // Check both in zone requirement
      if (this.parameters.requireBothInZone && 
          (this.percentD > levels.oversold + 0.1)) {
        return null;
      }
      
      // Check trend filter
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'StochRSI bullish crossover',
        percentK: this.percentK,
        percentD: this.percentD,
        stochRSI: this.stochRSI,
        levels,
        trend,
        divergence,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate level-based entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateLevelSignal(candle, levels, trend, divergence) {
    // Buy when both %K and %D are oversold and starting to turn up
    if (this.consecutiveOversold >= this.parameters.consecutiveBarsRequired &&
        this.percentK > this.previousPercentK && 
        this.percentD > this.previousPercentD) {
      
      // Check trend filter
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'StochRSI oversold level reversal',
        percentK: this.percentK,
        percentD: this.percentD,
        consecutiveOversold: this.consecutiveOversold,
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
    // Combine crossover and level conditions
    const crossoverSignal = this.generateCrossoverSignal(candle, levels, trend, divergence);
    const levelSignal = this.generateLevelSignal(candle, levels, trend, divergence);
    
    // Require both conditions or strong divergence
    if (crossoverSignal && levelSignal) {
      return crossoverSignal; // Return crossover signal with higher confidence
    }
    
    if (divergence && divergence.type === 'bullish' && divergence.strength !== 'weak') {
      return crossoverSignal || levelSignal;
    }
    
    return null;
  }

  /**
   * Generate divergence-focused entry signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateDivergenceSignal(candle, levels, trend, divergence) {
    if (!divergence || divergence.type !== 'bullish' || divergence.strength === 'weak') {
      return null;
    }
    
    // Require StochRSI to be in lower half and showing upward momentum
    if (this.percentK < 0.5 && this.percentK > this.previousPercentK) {
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'StochRSI bullish divergence',
        percentK: this.percentK,
        percentD: this.percentD,
        divergence,
        confidence: Math.min(0.9, confidence + 0.2) // Boost confidence for divergence
      });
    }
    
    return null;
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
    // Exit on bearish crossover in overbought region
    if (this.previousPercentK >= this.previousPercentD && 
        this.percentK < this.percentD &&
        this.percentK >= levels.overbought - 0.1) {
      
      return this.createExitSignal('stochrsi_crossover', candle.close, candle.timestamp, {
        reason: 'StochRSI bearish crossover',
        percentK: this.percentK,
        percentD: this.percentD,
        levels
      });
    }
    
    // Exit on overbought level with consecutive bars
    if (this.consecutiveOverbought >= this.parameters.consecutiveBarsRequired &&
        this.percentK < this.previousPercentK && 
        this.percentD < this.previousPercentD) {
      
      return this.createExitSignal('stochrsi_overbought', candle.close, candle.timestamp, {
        reason: 'StochRSI overbought reversal',
        percentK: this.percentK,
        percentD: this.percentD,
        consecutiveOverbought: this.consecutiveOverbought
      });
    }
    
    // Exit on bearish divergence
    if (divergence && divergence.type === 'bearish' && divergence.strength !== 'weak') {
      return this.createExitSignal('bearish_divergence', candle.close, candle.timestamp, {
        reason: 'StochRSI bearish divergence',
        percentK: this.percentK,
        percentD: this.percentD,
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
    
    // Extremity bonus
    if (direction === 'bullish') {
      const extremity = (levels.oversold - Math.min(this.percentK, this.percentD)) / levels.oversold;
      confidence += Math.min(0.25, extremity * 2);
    }
    
    // Crossover strength
    const separation = Math.abs(this.percentK - this.percentD);
    confidence += Math.min(0.15, separation * 2);
    
    // Consecutive bars bonus
    const consecutiveBonus = Math.min(0.2, (this.consecutiveOversold + this.consecutiveOverbought) * 0.05);
    confidence += consecutiveBonus;
    
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
    
    // RSI confirmation
    if (direction === 'bullish' && this.rsi < 40) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.rsi = null;
    this.stochRSI = null;
    this.percentK = null;
    this.percentD = null;
    this.previousPercentK = null;
    this.previousPercentD = null;
    this.rsiHistory = [];
    this.priceHistory = [];
    this.stochRSIHistory = [];
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.consecutiveOverbought = 0;
    this.consecutiveOversold = 0;
    this.signalStrength = 0;
  }

  /**
   * Get current indicator values
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      rsi: this.rsi,
      stochRSI: this.stochRSI,
      percentK: this.percentK,
      percentD: this.percentD,
      consecutiveOverbought: this.consecutiveOverbought,
      consecutiveOversold: this.consecutiveOversold,
      position: this.position,
      entryPrice: this.entryPrice,
      lastSignalType: this.lastSignalType
    };
  }
}

// Named export for compatibility
export { StochRSIStrategy };

// CommonJS export for compatibility with tests
module.exports = StochRSIStrategy;